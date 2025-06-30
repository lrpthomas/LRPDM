import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Form templates table
  await knex.schema.createTable('form_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
    
    // Form configuration
    table.jsonb('form_schema').notNullable(); // Field definitions, validation rules
    table.jsonb('ui_schema').defaultTo('{}'); // UI layout and styling
    table.jsonb('validation_rules').defaultTo('{}'); // Business rules
    table.jsonb('settings').defaultTo('{}'); // Form behavior settings
    
    // Form state
    table.boolean('is_published').defaultTo(false);
    table.string('version').defaultTo('1.0.0');
    table.uuid('parent_template_id').references('id').inTable('form_templates').onDelete('SET NULL');
    
    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['project_id']);
    table.index(['created_by']);
    table.index(['is_published']);
    table.index(['parent_template_id']);
  });

  // Form field types lookup
  await knex.schema.createTable('form_field_types', (table) => {
    table.string('id').primary(); // text, number, date, select, checkbox, etc.
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('default_config').defaultTo('{}');
    table.jsonb('validation_options').defaultTo('{}');
    table.boolean('supports_geolocation').defaultTo(false);
    table.boolean('supports_media').defaultTo(false);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
  });

  // Form submissions/responses
  await knex.schema.createTable('form_submissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('form_template_id').references('id').inTable('form_templates').onDelete('CASCADE');
    table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('submitted_by').references('id').inTable('users').onDelete('CASCADE');
    
    // Form data
    table.jsonb('form_data').notNullable(); // User responses
    table.jsonb('calculated_fields').defaultTo('{}'); // Auto-calculated values
    table.jsonb('validation_results').defaultTo('{}'); // Validation status
    
    // Submission metadata
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'archived']).defaultTo('draft');
    table.specificType('submission_location', 'geometry(Point, 4326)');
    table.timestamp('submitted_at');
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at');
    table.text('review_notes');
    
    // Sync and versioning
    table.boolean('is_synced').defaultTo(false);
    table.timestamp('synced_at');
    table.string('device_id');
    table.string('app_version');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['form_template_id']);
    table.index(['task_id']);
    table.index(['submitted_by']);
    table.index(['status']);
    table.index(['submitted_at']);
    table.index(['is_synced']);
    table.index(['device_id']);
  });

  // Data validation rules
  await knex.schema.createTable('validation_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    
    // Rule definition
    table.enum('rule_type', ['field_validation', 'cross_field', 'business_logic', 'spatial_constraint']).notNullable();
    table.jsonb('rule_config').notNullable(); // Rule parameters and logic
    table.text('error_message').notNullable();
    table.integer('severity').defaultTo(1); // 1=error, 2=warning, 3=info
    
    // Rule application
    table.boolean('is_active').defaultTo(true);
    table.integer('execution_order').defaultTo(0);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['project_id']);
    table.index(['rule_type']);
    table.index(['is_active']);
    table.index(['execution_order']);
  });

  // Conditional logic rules
  await knex.schema.createTable('form_conditional_logic', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('form_template_id').references('id').inTable('form_templates').onDelete('CASCADE');
    table.string('trigger_field').notNullable(); // Field that triggers the logic
    table.jsonb('conditions').notNullable(); // Condition definitions
    table.jsonb('actions').notNullable(); // Actions to perform (show/hide/required/etc)
    table.boolean('is_active').defaultTo(true);
    table.integer('execution_order').defaultTo(0);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['form_template_id']);
    table.index(['trigger_field']);
    table.index(['is_active']);
  });

  // Form analytics and usage tracking
  await knex.schema.createTable('form_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('form_template_id').references('id').inTable('form_templates').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Event tracking
    table.enum('event_type', ['form_opened', 'field_focused', 'field_completed', 'form_submitted', 'validation_error']).notNullable();
    table.string('field_name');
    table.jsonb('event_data').defaultTo('{}');
    table.integer('time_spent_seconds');
    
    // Context
    table.string('device_type');
    table.string('user_agent');
    table.specificType('location', 'geometry(Point, 4326)');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['form_template_id']);
    table.index(['user_id']);
    table.index(['event_type']);
    table.index(['created_at']);
  });

  // Offline data sync queue
  await knex.schema.createTable('offline_sync_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('entity_type', ['form_submission', 'task_update', 'attachment_upload']).notNullable();
    table.uuid('entity_id').notNullable(); // ID of the entity to sync
    table.jsonb('entity_data').notNullable(); // Full entity data
    table.enum('operation', ['create', 'update', 'delete']).notNullable();
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at');
    table.string('device_id').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['entity_type']);
    table.index(['operation']);
    table.index(['status']);
    table.index(['device_id']);
    table.index(['user_id']);
    table.index(['next_retry_at']);
  });

  // Create spatial indexes
  await knex.raw('CREATE INDEX idx_form_submissions_location ON form_submissions USING GIST (submission_location)');
  await knex.raw('CREATE INDEX idx_form_analytics_location ON form_analytics USING GIST (location)');

  // Insert default field types
  const fieldTypes = [
    { id: 'text', name: 'Text Input', description: 'Single line text input', supports_geolocation: false, supports_media: false, sort_order: 1 },
    { id: 'textarea', name: 'Text Area', description: 'Multi-line text input', supports_geolocation: false, supports_media: false, sort_order: 2 },
    { id: 'number', name: 'Number', description: 'Numeric input with validation', supports_geolocation: false, supports_media: false, sort_order: 3 },
    { id: 'email', name: 'Email', description: 'Email address with validation', supports_geolocation: false, supports_media: false, sort_order: 4 },
    { id: 'phone', name: 'Phone', description: 'Phone number input', supports_geolocation: false, supports_media: false, sort_order: 5 },
    { id: 'date', name: 'Date', description: 'Date picker', supports_geolocation: false, supports_media: false, sort_order: 6 },
    { id: 'datetime', name: 'Date & Time', description: 'Date and time picker', supports_geolocation: false, supports_media: false, sort_order: 7 },
    { id: 'select', name: 'Dropdown', description: 'Single selection dropdown', supports_geolocation: false, supports_media: false, sort_order: 8 },
    { id: 'multiselect', name: 'Multi-Select', description: 'Multiple selection dropdown', supports_geolocation: false, supports_media: false, sort_order: 9 },
    { id: 'radio', name: 'Radio Buttons', description: 'Single choice radio buttons', supports_geolocation: false, supports_media: false, sort_order: 10 },
    { id: 'checkbox', name: 'Checkboxes', description: 'Multiple choice checkboxes', supports_geolocation: false, supports_media: false, sort_order: 11 },
    { id: 'file', name: 'File Upload', description: 'File upload field', supports_geolocation: true, supports_media: true, sort_order: 12 },
    { id: 'image', name: 'Image Capture', description: 'Camera capture or image upload', supports_geolocation: true, supports_media: true, sort_order: 13 },
    { id: 'signature', name: 'Digital Signature', description: 'Digital signature capture', supports_geolocation: false, supports_media: false, sort_order: 14 },
    { id: 'location', name: 'GPS Location', description: 'Capture current location', supports_geolocation: true, supports_media: false, sort_order: 15 },
    { id: 'map', name: 'Map Point', description: 'Select location on map', supports_geolocation: true, supports_media: false, sort_order: 16 },
    { id: 'barcode', name: 'Barcode Scanner', description: 'QR/barcode scanner', supports_geolocation: false, supports_media: false, sort_order: 17 },
    { id: 'rating', name: 'Rating', description: 'Star or numeric rating', supports_geolocation: false, supports_media: false, sort_order: 18 },
    { id: 'slider', name: 'Slider', description: 'Range slider input', supports_geolocation: false, supports_media: false, sort_order: 19 },
    { id: 'calculation', name: 'Calculated Field', description: 'Auto-calculated based on other fields', supports_geolocation: false, supports_media: false, sort_order: 20 }
  ];

  for (const fieldType of fieldTypes) {
    await knex('form_field_types').insert(fieldType);
  }

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_validation_rules_updated_at BEFORE UPDATE ON validation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_offline_sync_queue_updated_at BEFORE UPDATE ON offline_sync_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_form_templates_updated_at ON form_templates');
  await knex.raw('DROP TRIGGER IF EXISTS update_form_submissions_updated_at ON form_submissions');
  await knex.raw('DROP TRIGGER IF EXISTS update_validation_rules_updated_at ON validation_rules');
  await knex.raw('DROP TRIGGER IF EXISTS update_offline_sync_queue_updated_at ON offline_sync_queue');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('offline_sync_queue');
  await knex.schema.dropTableIfExists('form_analytics');
  await knex.schema.dropTableIfExists('form_conditional_logic');
  await knex.schema.dropTableIfExists('validation_rules');
  await knex.schema.dropTableIfExists('form_submissions');
  await knex.schema.dropTableIfExists('form_field_types');
  await knex.schema.dropTableIfExists('form_templates');
}