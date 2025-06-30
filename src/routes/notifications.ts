import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db as knex } from '../config/database';

const router = Router();

// Validation schemas
const createNotificationSchema = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.any()).default({}),
  deliveryMethod: z.enum(['push', 'email', 'sms', 'in_app']).default('in_app'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduledFor: z.string().datetime().optional(),
  relatedEntityId: z.string().uuid().optional(),
  relatedEntityType: z.string().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional()
});

const notificationQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  deliveryMethod: z.enum(['push', 'email', 'sms', 'in_app']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  relatedEntityType: z.string().optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0),
  sortBy: z.enum(['created_at', 'scheduled_for', 'priority']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const updateNotificationSchema = z.object({
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'cancelled']).optional(),
  isRead: z.boolean().optional(),
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().optional(),
  nextRetryAt: z.string().datetime().optional()
});

// Get notifications with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const params = notificationQuerySchema.parse(req.query);
    
    let query = knex('notifications')
      .select([
        'notifications.*',
        'notification_templates.name as template_name',
        'notification_templates.type as template_type',
        'users.username as user_username',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name'
      ])
      .leftJoin('notification_templates', 'notifications.template_id', 'notification_templates.id')
      .leftJoin('users', 'notifications.user_id', 'users.id');

    // Apply filters
    if (params.userId) {
      query = query.where('notifications.user_id', params.userId);
    }
    
    if (params.deliveryMethod) {
      query = query.where('notifications.delivery_method', params.deliveryMethod);
    }
    
    if (params.status) {
      query = query.where('notifications.status', params.status);
    }
    
    if (params.priority) {
      query = query.where('notifications.priority', params.priority);
    }
    
    if (params.isRead !== undefined) {
      query = query.where('notifications.is_read', params.isRead);
    }
    
    if (params.relatedEntityType) {
      query = query.where('notifications.related_entity_type', params.relatedEntityType);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().count('* as count').first();
    
    // Apply sorting and pagination
    query = query
      .orderBy(`notifications.${params.sortBy}`, params.sortOrder)
      .limit(params.limit)
      .offset(params.offset);

    const [notifications, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      template: {
        id: notification.template_id,
        name: notification.template_name,
        type: notification.template_type
      },
      user: {
        id: notification.user_id,
        username: notification.user_username,
        firstName: notification.user_first_name,
        lastName: notification.user_last_name
      },
      title: notification.title,
      body: notification.body,
      data: notification.data,
      deliveryMethod: notification.delivery_method,
      status: notification.status,
      priority: notification.priority,
      scheduledFor: notification.scheduled_for,
      sentAt: notification.sent_at,
      deliveredAt: notification.delivered_at,
      readAt: notification.read_at,
      errorMessage: notification.error_message,
      retryCount: notification.retry_count,
      nextRetryAt: notification.next_retry_at,
      relatedEntity: notification.related_entity_id ? {
        id: notification.related_entity_id,
        type: notification.related_entity_type
      } : null,
      isRead: notification.is_read,
      isClicked: notification.is_clicked,
      clickedAt: notification.clicked_at,
      clickAction: notification.click_action,
      createdAt: notification.created_at
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        total: parseInt(countResult.count),
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < parseInt(countResult.count)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to retrieve notifications'
    });
  }
});

// Get single notification by ID
router.get('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await knex('notifications')
      .select([
        'notifications.*',
        'notification_templates.name as template_name',
        'notification_templates.type as template_type',
        'users.username as user_username',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        knex.raw('ST_AsGeoJSON(notifications.location)::json as location_geojson')
      ])
      .leftJoin('notification_templates', 'notifications.template_id', 'notification_templates.id')
      .leftJoin('users', 'notifications.user_id', 'users.id')
      .where('notifications.id', notificationId)
      .first();

    if (!notification) {
      res.status(404).json({
        error: 'Notification not found'
      });
      return;
    }

    res.json({
      notification: {
        id: notification.id,
        template: {
          id: notification.template_id,
          name: notification.template_name,
          type: notification.template_type
        },
        user: {
          id: notification.user_id,
          username: notification.user_username,
          firstName: notification.user_first_name,
          lastName: notification.user_last_name
        },
        title: notification.title,
        body: notification.body,
        data: notification.data,
        deliveryMethod: notification.delivery_method,
        status: notification.status,
        priority: notification.priority,
        scheduledFor: notification.scheduled_for,
        sentAt: notification.sent_at,
        deliveredAt: notification.delivered_at,
        readAt: notification.read_at,
        errorMessage: notification.error_message,
        retryCount: notification.retry_count,
        nextRetryAt: notification.next_retry_at,
        relatedEntity: notification.related_entity_id ? {
          id: notification.related_entity_id,
          type: notification.related_entity_type
        } : null,
        location: notification.location_geojson,
        isRead: notification.is_read,
        isClicked: notification.is_clicked,
        clickedAt: notification.clicked_at,
        clickAction: notification.click_action,
        createdAt: notification.created_at
      }
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notification'
    });
  }
});

// Create new notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const notificationData = createNotificationSchema.parse(req.body);
    
    // Build the notification record
    const notificationRecord: any = {
      template_id: notificationData.templateId,
      user_id: notificationData.userId,
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data,
      delivery_method: notificationData.deliveryMethod,
      priority: notificationData.priority,
      scheduled_for: notificationData.scheduledFor || knex.fn.now(),
      related_entity_id: notificationData.relatedEntityId,
      related_entity_type: notificationData.relatedEntityType
    };

    // Add location if provided
    if (notificationData.location) {
      notificationRecord.location = knex.raw(
        'ST_SetSRID(ST_MakePoint(?, ?), 4326)',
        [notificationData.location.longitude, notificationData.location.latitude]
      );
    }

    const [notification] = await knex('notifications')
      .insert(notificationRecord)
      .returning('*');

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        templateId: notification.template_id,
        userId: notification.user_id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        deliveryMethod: notification.delivery_method,
        status: notification.status,
        priority: notification.priority,
        scheduledFor: notification.scheduled_for,
        relatedEntityId: notification.related_entity_id,
        relatedEntityType: notification.related_entity_type,
        createdAt: notification.created_at
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to create notification'
    });
  }
});

// Update notification (mark as read, update status, etc.)
router.put('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const updates = updateNotificationSchema.parse(req.body);
    
    // Check if notification exists
    const existingNotification = await knex('notifications').where('id', notificationId).first();
    if (!existingNotification) {
      res.status(404).json({
        error: 'Notification not found'
      });
      return;
    }

    // Build update record
    const updateRecord: any = {};
    
    if (updates.status !== undefined) updateRecord.status = updates.status;
    if (updates.isRead !== undefined) {
      updateRecord.is_read = updates.isRead;
      if (updates.isRead && !existingNotification.read_at) {
        updateRecord.read_at = knex.fn.now();
      }
    }
    if (updates.sentAt !== undefined) updateRecord.sent_at = updates.sentAt;
    if (updates.deliveredAt !== undefined) updateRecord.delivered_at = updates.deliveredAt;
    if (updates.readAt !== undefined) updateRecord.read_at = updates.readAt;
    if (updates.errorMessage !== undefined) updateRecord.error_message = updates.errorMessage;
    if (updates.retryCount !== undefined) updateRecord.retry_count = updates.retryCount;
    if (updates.nextRetryAt !== undefined) updateRecord.next_retry_at = updates.nextRetryAt;

    const [updatedNotification] = await knex('notifications')
      .where('id', notificationId)
      .update(updateRecord)
      .returning('*');

    res.json({
      message: 'Notification updated successfully',
      notification: {
        id: updatedNotification.id,
        status: updatedNotification.status,
        isRead: updatedNotification.is_read,
        sentAt: updatedNotification.sent_at,
        deliveredAt: updatedNotification.delivered_at,
        readAt: updatedNotification.read_at,
        errorMessage: updatedNotification.error_message,
        retryCount: updatedNotification.retry_count,
        nextRetryAt: updatedNotification.next_retry_at
      }
    });

  } catch (error) {
    console.error('Update notification error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to update notification'
    });
  }
});

// Mark notification as read
router.post('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    
    const [updatedNotification] = await knex('notifications')
      .where('id', notificationId)
      .update({
        is_read: true,
        read_at: knex.fn.now()
      })
      .returning(['id', 'is_read', 'read_at']);

    if (!updatedNotification) {
      res.status(404).json({
        error: 'Notification not found'
      });
      return;
    }

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: updatedNotification.id,
        isRead: updatedNotification.is_read,
        readAt: updatedNotification.read_at
      }
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read for a user
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({
        error: 'User ID is required'
      });
      return;
    }

    const updatedCount = await knex('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: knex.fn.now()
      });

    res.json({
      message: 'All notifications marked as read',
      updatedCount
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Get unread count for a user
router.get('/unread-count/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const result = await knex('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count')
      .first();

    res.json({
      unreadCount: parseInt(result.count)
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Failed to get unread count'
    });
  }
});

// Delete notification
router.delete('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    
    const deletedCount = await knex('notifications')
      .where('id', notificationId)
      .del();

    if (deletedCount === 0) {
      res.status(404).json({
        error: 'Notification not found'
      });
      return;
    }

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification'
    });
  }
});

export default router;