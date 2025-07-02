import { Router, Request, Response } from 'express';
import { db as knex } from '../config/database';

const router: Router = Router();

// Get notifications for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = '20', offset = '0' } = req.query;
    
    const notifications = await knex('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notifications'
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
      unreadCount: parseInt((result as any).count)
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Failed to get unread count'
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
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read'
    });
  }
});

// Create a simple notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, type: _type = 'info' } = req.body;
    
    // Get or create a default template
    let template = await knex('notification_templates')
      .where('name', 'default_notification')
      .first();
    
    if (!template) {
      [template] = await knex('notification_templates')
        .insert({
          name: 'default_notification',
          title_template: '{{title}}',
          body_template: '{{body}}',
          type: 'system_alert'
        })
        .returning('*');
    }
    
    const [notification] = await knex('notifications')
      .insert({
        template_id: template.id,
        user_id: userId,
        title,
        body,
        delivery_method: 'in_app',
        status: 'sent'
      })
      .returning('*');

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Failed to create notification'
    });
  }
});

export default router;