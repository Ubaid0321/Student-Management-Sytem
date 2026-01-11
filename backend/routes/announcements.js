const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get all announcements
  router.get('/', (req, res) => {
    const { type, audience, active } = req.query;
    let announcements = [...db.announcements];

    if (type) {
      announcements = announcements.filter(a => a.type === type);
    }
    if (audience) {
      announcements = announcements.filter(a => a.targetAudience === audience || a.targetAudience === 'all');
    }
    if (active === 'true') {
      const today = new Date().toISOString().split('T')[0];
      announcements = announcements.filter(a => !a.expiresAt || a.expiresAt >= today);
    }

    // Sort by date (newest first) and priority
    announcements.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Enrich with creator name
    const enriched = announcements.map(ann => {
      const creator = db.users.find(u => u.id === ann.createdBy);
      return {
        ...ann,
        createdByName: creator ? creator.name : 'System'
      };
    });

    res.json(enriched);
  });

  // Get single announcement
  router.get('/:id', (req, res) => {
    const announcement = db.announcements.find(a => a.id === req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const creator = db.users.find(u => u.id === announcement.createdBy);
    res.json({
      ...announcement,
      createdByName: creator ? creator.name : 'System'
    });
  });

  // Create announcement
  router.post('/', (req, res) => {
    const { title, content, type, priority, targetAudience, expiresAt, createdBy } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newAnnouncement = {
      id: uuidv4(),
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      attachments: [],
      createdBy: createdBy || 'admin-001',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      views: 0,
      isActive: true
    };

    db.announcements.unshift(newAnnouncement);

    // Create notifications for relevant users
    let targetUsers = [];
    if (targetAudience === 'students' || targetAudience === 'all') {
      targetUsers = [...targetUsers, ...db.students.map(s => s.id)];
    }
    if (targetAudience === 'teachers' || targetAudience === 'all') {
      targetUsers = [...targetUsers, ...db.teachers.map(t => t.id)];
    }

    targetUsers.forEach(userId => {
      db.notifications.push({
        id: uuidv4(),
        userId,
        type: 'announcement',
        title: `New: ${title}`,
        message: content.substring(0, 100) + '...',
        referenceId: newAnnouncement.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: newAnnouncement
    });
  });

  // Update announcement
  router.put('/:id', (req, res) => {
    const annIndex = db.announcements.findIndex(a => a.id === req.params.id);
    if (annIndex === -1) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;

    db.announcements[annIndex] = {
      ...db.announcements[annIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Announcement updated',
      announcement: db.announcements[annIndex]
    });
  });

  // Delete announcement
  router.delete('/:id', (req, res) => {
    const annIndex = db.announcements.findIndex(a => a.id === req.params.id);
    if (annIndex === -1) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const deleted = db.announcements.splice(annIndex, 1)[0];

    // Remove related notifications
    db.notifications = db.notifications.filter(n => n.referenceId !== req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted',
      announcement: { id: deleted.id, title: deleted.title }
    });
  });

  // Get announcement types
  router.get('/meta/types', (req, res) => {
    res.json([
      { value: 'general', label: 'General', icon: 'information-circle' },
      { value: 'exam', label: 'Examination', icon: 'document-text' },
      { value: 'event', label: 'Event', icon: 'calendar' },
      { value: 'holiday', label: 'Holiday', icon: 'sunny' },
      { value: 'finance', label: 'Finance', icon: 'cash' },
      { value: 'academic', label: 'Academic', icon: 'school' },
      { value: 'urgent', label: 'Urgent', icon: 'warning' }
    ]);
  });

  return router;
};

