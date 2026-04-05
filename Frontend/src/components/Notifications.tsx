import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Megaphone, Calendar, CheckCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

import { notificationsAPI } from "../api/notifications";

interface NotificationsProps {
  onBack: () => void;
}

interface Notification {
  id: number | string;
  type: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  validUntil?: string;
  link?: string;
}

export function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Fetch real alerts
        const apiData = await notificationsAPI.getNotifications();

        // Map to UI format
        const mapped: Notification[] = apiData.map(n => ({
          id: n.id,
          type: n.type === 'alert' ? 'reminder' : n.type === 'info' ? 'announcement' : 'promotion',
          title: n.title,
          description: n.message,
          date: n.createdAt,
          read: false, // Default to unread as we fetch fresh
          link: n.link
        }));

        setNotifications(mapped);
      } catch (e) {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const markAsRead = (id: number | string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number | string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = filter === "all"
    ? notifications
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "promotion":
        return <Megaphone className="w-5 h-5" />;
      case "reminder":
        return <Calendar className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "promotion":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "reminder":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
              <div>
                <h1>Notifications</h1>
                <p className="text-white/80 mt-1">Stay updated with club news and offers</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                onClick={markAllAsRead}
                className="text-white hover:bg-white/10"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="all">
                All Notifications
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-muted text-foreground">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-secondary text-primary">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-muted-foreground mb-2">No notifications</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all ${!notification.read ? 'border-secondary bg-secondary/5' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg border ${getTypeColor(notification.type)}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <CardTitle className="flex-1">{notification.title}</CardTitle>
                            {!notification.read && (
                              <Badge className="bg-secondary text-primary">New</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-2">
                            {notification.description}
                          </CardDescription>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>{new Date(notification.date).toLocaleDateString()}</span>
                            {notification.validUntil && (
                              <span className="text-secondary">
                                Valid until: {new Date(notification.validUntil).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsRead(notification.id)}
                            className="shrink-0"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-muted-foreground mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">You have no unread notifications</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="border-secondary bg-secondary/5"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg border ${getTypeColor(notification.type)}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <CardTitle className="flex-1">{notification.title}</CardTitle>
                            <Badge className="bg-secondary text-primary">New</Badge>
                          </div>
                          <CardDescription className="mt-2">
                            {notification.description}
                          </CardDescription>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>{new Date(notification.date).toLocaleDateString()}</span>
                            {notification.validUntil && (
                              <span className="text-secondary">
                                Valid until: {new Date(notification.validUntil).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(notification.id)}
                          className="shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
