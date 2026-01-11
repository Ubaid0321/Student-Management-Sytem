import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

// Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import ViewAttendanceScreen from '../screens/student/ViewAttendanceScreen';
import ViewResultsScreen from '../screens/student/ViewResultsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Dashboard Stack
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentDashboardMain" component={StudentDashboard} />
    <Stack.Screen name="ViewAttendance" component={ViewAttendanceScreen} />
    <Stack.Screen name="ViewResults" component={ViewResultsScreen} />
  </Stack.Navigator>
);

// Student Tab Navigator
const StudentTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Attendance':
            iconName = focused ? 'calendar-check' : 'calendar-check-outline';
            break;
          case 'Results':
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
    <Tab.Screen name="Home" component={DashboardStack} />
    <Tab.Screen name="Attendance" component={ViewAttendanceScreen} />
    <Tab.Screen name="Results" component={ViewResultsScreen} />
  </Tab.Navigator>
);

export default StudentTabNavigator;

