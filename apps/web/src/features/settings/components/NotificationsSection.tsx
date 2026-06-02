import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

/**
 * Notification preferences section with toggle checkboxes for email,
 * security alerts, and product updates.
 */
export function NotificationsSection() {
  const [notifications, setNotifications] = useState({
    email: true,
    security: true,
    updates: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-semibold">Notifications</h2>
      </div>
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-slate-400">Receive email updates about your vault</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.email}
            onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
            className="w-5 h-5 rounded"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium">Security Alerts</p>
            <p className="text-sm text-slate-400">Get notified about security events</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.security}
            onChange={(e) => setNotifications({ ...notifications, security: e.target.checked })}
            className="w-5 h-5 rounded"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium">Product Updates</p>
            <p className="text-sm text-slate-400">Stay updated on new features</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.updates}
            onChange={(e) => setNotifications({ ...notifications, updates: e.target.checked })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>
    </motion.div>
  );
}
