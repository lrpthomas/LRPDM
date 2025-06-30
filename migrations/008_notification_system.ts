import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Notification templates
  await knex.schema.createTable('notification_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.string('title_template').notNullable(); // Template for notification title
    table.text('body_template').notNullable(); // Template for notification body
    table.text('email_template'); // HTML template for email notifications
    
    // Notification behavior
    table.enum('type', [
      'task_assigned', 'task_due', 'task_completed', 'task_overdue',
      'form_submitted', 'form_approved', 'form_rejected',
      'project_updated', 'user_mentioned', 'system_alert',
      'data_sync_complete', 'data_sync_failed', 'security_alert',
      'reminder', 'announcement'
    ]).notNullable();
    
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.enum('delivery_method', ['push', 'email', 'sms', 'in_app']).defaultTo('in_app');
    
    // Trigger conditions
    table.jsonb('trigger_conditions').defaultTo('{}'); // When to send this notification
    table.jsonb('template_variables').defaultTo('{}'); // Available variables for templates
    
    // Timing
    table.integer('delay_minutes').defaultTo(0); // Delay before sending
    table.boolean('is_recurring').defaultTo(false);
    table.string('recurrence_pattern'); // Cron-like pattern for recurring notifications
    
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['type']);
    table.index(['priority']);
    table.index(['delivery_method']);
    table.index(['is_active']);
  });

  // User notification preferences
  await knex.schema.createTable('user_notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('notification_type').notNullable(); // Matches notification_templates.type
    
    // Delivery preferences
    table.boolean('push_enabled').defaultTo(true);
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('sms_enabled').defaultTo(false);
    table.boolean('in_app_enabled').defaultTo(true);
    
    // Timing preferences
    table.time('quiet_hours_start'); // No notifications during these hours
    table.time('quiet_hours_end');
    table.specificType('timezone', 'text').defaultTo('UTC');
    
    // Frequency controls
    table.enum('frequency', ['immediate', 'hourly', 'daily', 'weekly', 'never']).defaultTo('immediate');
    table.integer('digest_hour').defaultTo(9); // Hour of day for digest notifications
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['notification_type']);
    table.unique(['user_id', 'notification_type']);
  });

  // Device tokens for push notifications
  await knex.schema.createTable('device_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('token').notNullable();
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    table.string('device_id');
    table.string('device_name');
    table.string('app_version');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['token']);
    table.index(['platform']);
    table.index(['is_active']);
    table.unique(['token', 'platform']);
  });

  // Notification queue and delivery
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_id').references('id').inTable('notification_templates').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Content
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.jsonb('data').defaultTo('{}'); // Additional data for the notification
    
    // Delivery details
    table.enum('delivery_method', ['push', 'email', 'sms', 'in_app']).notNullable();
    table.enum('status', ['pending', 'sent', 'delivered', 'failed', 'cancelled']).defaultTo('pending');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    
    // Scheduling
    table.timestamp('scheduled_for').defaultTo(knex.fn.now());
    table.timestamp('sent_at');
    table.timestamp('delivered_at');
    table.timestamp('read_at');
    
    // Error handling
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at');
    
    // Context
    table.uuid('related_entity_id'); // ID of task, project, form, etc.
    table.string('related_entity_type'); // tasks, projects, forms, etc.
    table.specificType('location', 'geometry(Point, 4326)'); // Location context if relevant
    
    // Interaction tracking
    table.boolean('is_read').defaultTo(false);
    table.boolean('is_clicked').defaultTo(false);
    table.timestamp('clicked_at');
    table.string('click_action'); // What action was taken
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['template_id']);
    table.index(['delivery_method']);
    table.index(['status']);
    table.index(['priority']);
    table.index(['scheduled_for']);
    table.index(['is_read']);
    table.index(['related_entity_type', 'related_entity_id']);
    table.index(['created_at']);
  });

  // Notification subscriptions (for following specific entities)
  await knex.schema.createTable('notification_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('entity_type').notNullable(); // tasks, projects, etc.
    table.uuid('entity_id').notNullable(); // ID of the specific entity
    
    // Subscription settings
    table.specificType('notification_types', 'text[]'); // Array of notification types to receive
    table.boolean('is_active').defaultTo(true);
    table.enum('subscription_level', ['all', 'mentions_only', 'important_only']).defaultTo('all');
    
    // Auto-subscription rules
    table.boolean('auto_subscribed').defaultTo(false); // Was this auto-created?
    table.string('auto_reason'); // Why was this auto-created? (assigned, created, etc.)
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['entity_type', 'entity_id']);
    table.index(['is_active']);
    table.unique(['user_id', 'entity_type', 'entity_id']);
  });

  // Notification delivery logs (for analytics and debugging)
  await knex.schema.createTable('notification_delivery_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Delivery attempt details
    table.enum('delivery_method', ['push', 'email', 'sms', 'in_app']).notNullable();
    table.enum('status', ['success', 'failed', 'bounced', 'blocked']).notNullable();
    table.text('response_message'); // Response from delivery service
    table.string('provider'); // FCM, APNS, SendGrid, etc.
    table.string('external_id'); // ID from external service
    
    // Performance metrics
    table.integer('delivery_time_ms'); // Time taken to deliver
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    table.timestamp('delivered_at');
    
    // Error details
    table.string('error_code');
    table.text('error_details');
    table.boolean('should_retry').defaultTo(false);
    
    // Indexes
    table.index(['notification_id']);
    table.index(['user_id']);
    table.index(['delivery_method']);
    table.index(['status']);
    table.index(['attempted_at']);
    table.index(['provider']);
  });

  // Announcement system
  await knex.schema.createTable('announcements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.enum('type', ['info', 'warning', 'success', 'error', 'maintenance']).defaultTo('info');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    
    // Targeting
    table.specificType('target_roles', 'text[]'); // Which roles should see this
    table.specificType('target_users', 'uuid[]'); // Specific users (if not role-based)
    table.uuid('target_project_id').references('id').inTable('projects').onDelete('CASCADE'); // Project-specific announcements
    
    // Scheduling
    table.timestamp('start_date').defaultTo(knex.fn.now());
    table.timestamp('end_date');
    table.boolean('is_sticky').defaultTo(false); // Stays at top until dismissed
    table.boolean('requires_acknowledgment').defaultTo(false);
    
    // Interaction tracking
    table.integer('view_count').defaultTo(0);
    table.integer('acknowledgment_count').defaultTo(0);
    
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['type']);
    table.index(['priority']);
    table.index(['start_date', 'end_date']);
    table.index(['target_project_id']);
    table.index(['is_sticky']);
    table.index(['created_by']);
  });

  // User announcement interactions
  await knex.schema.createTable('announcement_interactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('announcement_id').references('id').inTable('announcements').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('action', ['viewed', 'dismissed', 'acknowledged', 'clicked']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['announcement_id']);
    table.index(['user_id']);
    table.index(['action']);
    table.unique(['announcement_id', 'user_id', 'action']);
  });

  // Create spatial indexes
  await knex.raw('CREATE INDEX idx_notifications_location ON notifications USING GIST (location)');

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_notification_subscriptions_updated_at BEFORE UPDATE ON notification_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // Insert default notification templates
  const defaultTemplates = [
    {
      name: 'task_assigned',
      title_template: 'New task assigned: {{task_title}}',
      body_template: 'You have been assigned a new task: {{task_title}}. Due date: {{due_date}}',
      type: 'task_assigned',
      priority: 'medium'
    },
    {
      name: 'task_due_soon',
      title_template: 'Task due soon: {{task_title}}',
      body_template: 'Task "{{task_title}}" is due in {{hours_until_due}} hours.',
      type: 'task_due',
      priority: 'high'
    },
    {
      name: 'task_overdue',
      title_template: 'Overdue task: {{task_title}}',
      body_template: 'Task "{{task_title}}" is overdue by {{hours_overdue}} hours.',
      type: 'task_overdue',
      priority: 'urgent'
    },
    {
      name: 'form_submitted',
      title_template: 'Form submitted: {{form_name}}',
      body_template: '{{user_name}} submitted form "{{form_name}}" for task {{task_title}}.',
      type: 'form_submitted',
      priority: 'medium'
    }
  ];

  for (const template of defaultTemplates) {
    await knex('notification_templates').insert(template);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences');
  await knex.raw('DROP TRIGGER IF EXISTS update_notification_subscriptions_updated_at ON notification_subscriptions');
  await knex.raw('DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('announcement_interactions');
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('notification_delivery_logs');
  await knex.schema.dropTableIfExists('notification_subscriptions');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('device_tokens');
  await knex.schema.dropTableIfExists('user_notification_preferences');
  await knex.schema.dropTableIfExists('notification_templates');
}