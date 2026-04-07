import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[ti.wrap, focused && { backgroundColor: colors.primaryLight }]}>
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.textTertiary} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 18,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Overview',     tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid'        : 'grid-outline'}        focused={focused} /> }} />
      <Tabs.Screen name="inbox"     options={{ title: 'Inbox',        tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} /> }} />
      <Tabs.Screen name="scheduler" options={{ title: 'Schedule',     tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar'    : 'calendar-outline'}    focused={focused} /> }} />
      <Tabs.Screen name="brain"     options={{ title: 'Intelligence', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'flash'       : 'flash-outline'}       focused={focused} /> }} />
    </Tabs>
  );
}

const ti = StyleSheet.create({
  wrap: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
