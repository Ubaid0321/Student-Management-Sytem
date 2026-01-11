import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

// Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import StudentsListScreen from '../screens/admin/StudentsListScreen';
import AddEditStudentScreen from '../screens/admin/AddEditStudentScreen';
import StudentDetailScreen from '../screens/admin/StudentDetailScreen';
import AttendanceListScreen from '../screens/admin/AttendanceListScreen';
import MarkAttendanceScreen from '../screens/admin/MarkAttendanceScreen';
import MarksListScreen from '../screens/admin/MarksListScreen';
import AddMarksScreen from '../screens/admin/AddMarksScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Students Stack
const StudentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentsList" component={StudentsListScreen} />
    <Stack.Screen name="AddStudent" component={AddEditStudentScreen} />
    <Stack.Screen name="EditStudent" component={AddEditStudentScreen} />
    <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
  </Stack.Navigator>
);

// Attendance Stack
const AttendanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
    <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
  </Stack.Navigator>
);

// Marks Stack
const MarksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MarksList" component={MarksListScreen} />
    <Stack.Screen name="AddMarks" component={AddMarksScreen} />
  </Stack.Navigator>
);

// Admin Tab Navigator
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Dashboard':
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
            break;
          case 'Students':
            iconName = focused ? 'account-group' : 'account-group-outline';
            break;
          case 'Attendance':
            iconName = focused ? 'calendar-check' : 'calendar-check-outline';
            break;
          case 'Marks':
            iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
            break;
          default:
            iconName = 'circle';
        }

        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray[400],
      tabBarStyle: {
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.gray[200],
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboard} />
    <Tab.Screen name="Students" component={StudentsStack} />
    <Tab.Screen name="Attendance" component={AttendanceStack} />
    <Tab.Screen name="Marks" component={MarksStack} />
  </Tab.Navigator>
);

export default AdminTabNavigator;
