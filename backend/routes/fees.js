const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get fee structure
  router.get('/structure', (req, res) => {
    res.json(db.fees);
  });

  // Get all fee records
  router.get('/', (req, res) => {
    const { status, semesterId, studentId } = req.query;
    let records = [...db.feePayments];

    if (status) {
      records = records.filter(r => r.status === status);
    }
    if (semesterId) {
      records = records.filter(r => r.semesterId === semesterId);
    }
    if (studentId) {
      records = records.filter(r => r.studentId === studentId);
    }

    // Enrich with student details
    const enriched = records.map(record => {
      const student = db.students.find(s => s.id === record.studentId);
      const semester = db.semesters.find(s => s.id === record.semesterId);
      return {
        ...record,
        studentName: student ? student.name : 'Unknown',
        studentRollNumber: student ? student.rollNumber : 'Unknown',
        semesterName: semester ? semester.name : 'Unknown',
        balance: record.totalAmount - record.paidAmount
      };
    });

    res.json(enriched);
  });

  // Get student's fee record
  router.get('/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    const records = db.feePayments.filter(r => r.studentId === studentId);
    
    const enriched = records.map(record => {
      const semester = db.semesters.find(s => s.id === record.semesterId);
      return {
        ...record,
        semesterName: semester ? semester.name : 'Unknown',
        balance: record.totalAmount - record.paidAmount
      };
    });

    // Calculate totals
    const totalDue = enriched.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalPaid = enriched.reduce((sum, r) => sum + r.paidAmount, 0);

    res.json({
      records: enriched,
      summary: {
        totalDue,
        totalPaid,
        balance: totalDue - totalPaid
      }
    });
  });

  // Create fee record for student
  router.post('/', (req, res) => {
    const { studentId, semesterId, totalAmount, dueDate } = req.body;

    if (!studentId || !semesterId || !totalAmount) {
      return res.status(400).json({ error: 'studentId, semesterId, and totalAmount are required' });
    }

    const student = db.students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const existing = db.feePayments.find(f => f.studentId === studentId && f.semesterId === semesterId);
    if (existing) {
      return res.status(400).json({ error: 'Fee record already exists for this semester' });
    }

    const newRecord = {
      id: uuidv4(),
      studentId,
      semesterId,
      totalAmount,
      paidAmount: 0,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      payments: [],
      createdAt: new Date().toISOString()
    };

    db.feePayments.push(newRecord);

    res.status(201).json({
      success: true,
      message: 'Fee record created',
      record: newRecord
    });
  });

  // Record payment
  router.post('/:id/pay', (req, res) => {
    const recordIndex = db.feePayments.findIndex(f => f.id === req.params.id);
    if (recordIndex === -1) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    const { amount, method, remarks } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const record = db.feePayments[recordIndex];
    const balance = record.totalAmount - record.paidAmount;

    if (amount > balance) {
      return res.status(400).json({ error: `Amount exceeds balance. Maximum payable: ${balance}` });
    }

    const payment = {
      id: uuidv4(),
      amount,
      date: new Date().toISOString(),
      method: method || 'Cash',
      receiptNo: `RCP-${Date.now()}`,
      remarks: remarks || ''
    };

    record.payments.push(payment);
    record.paidAmount += amount;
    record.status = record.paidAmount >= record.totalAmount ? 'paid' : 'partial';
    record.updatedAt = new Date().toISOString();

    db.feePayments[recordIndex] = record;

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      record: {
        ...record,
        balance: record.totalAmount - record.paidAmount
      }
    });
  });

  // Update fee structure
  router.post('/structure', (req, res) => {
    const { name, amount, type, dueDay } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }

    const newFee = {
      id: uuidv4(),
      name,
      amount,
      type: type || 'semester',
      dueDay: dueDay || 15
    };

    db.fees.push(newFee);

    res.status(201).json({
      success: true,
      message: 'Fee type added',
      fee: newFee
    });
  });

  // Get fee summary/statistics
  router.get('/summary', (req, res) => {
    const { semesterId } = req.query;
    let records = [...db.feePayments];

    if (semesterId) {
      records = records.filter(r => r.semesterId === semesterId);
    }

    const totalStudents = records.length;
    const totalDue = records.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalCollected = records.reduce((sum, r) => sum + r.paidAmount, 0);
    const paidCount = records.filter(r => r.status === 'paid').length;
    const partialCount = records.filter(r => r.status === 'partial').length;
    const pendingCount = records.filter(r => r.status === 'pending').length;

    res.json({
      totalStudents,
      totalDue,
      totalCollected,
      totalPending: totalDue - totalCollected,
      collectionRate: totalDue > 0 ? ((totalCollected / totalDue) * 100).toFixed(2) : 0,
      statusBreakdown: {
        paid: paidCount,
        partial: partialCount,
        pending: pendingCount
      }
    });
  });

  // Get defaulters list
  router.get('/defaulters', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const defaulters = db.feePayments
      .filter(r => r.status !== 'paid' && r.dueDate < today)
      .map(record => {
        const student = db.students.find(s => s.id === record.studentId);
        return {
          ...record,
          studentName: student ? student.name : 'Unknown',
          studentRollNumber: student ? student.rollNumber : 'Unknown',
          studentPhone: student ? student.phone : '',
          balance: record.totalAmount - record.paidAmount,
          overdueDays: Math.floor((new Date() - new Date(record.dueDate)) / (1000 * 60 * 60 * 24))
        };
      })
      .sort((a, b) => b.balance - a.balance);

    res.json(defaulters);
  });

  return router;
};

