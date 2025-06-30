import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('username').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.string('phone');
    table.enum('role', ['admin', 'manager', 'editor', 'viewer']).defaultTo('viewer');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.jsonb('preferences').defaultTo('{}');
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['email']);
    table.index(['username']);
    table.index(['role']);
    table.index(['status']);
  });

  // Projects table
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['active', 'completed', 'archived', 'cancelled']).defaultTo('active');
    table.date('start_date');
    table.date('end_date');
    table.specificType('project_bounds', 'geometry(Polygon, 4326)');
    table.jsonb('settings').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['owner_id']);
    table.index(['status']);
    table.index(['start_date', 'end_date']);
  });

  // Task categories table
  await knex.schema.createTable('task_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('description');
    table.string('color').defaultTo('#007bff');
    table.string('icon');
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['project_id']);
    table.unique(['name', 'project_id']);
  });

  // Tasks table
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('description');
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('category_id').references('id').inTable('task_categories').onDelete('SET NULL');
    table.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
    
    // Status and priority
    table.enum('status', ['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).defaultTo('pending');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    
    // Dates and scheduling
    table.timestamp('due_date');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('estimated_hours');
    table.integer('actual_hours');
    
    // Location data
    table.specificType('location', 'geometry(Point, 4326)');
    table.specificType('work_area', 'geometry(Polygon, 4326)');
    table.text('address');
    
    // Recurring tasks
    table.enum('recurrence_type', ['none', 'daily', 'weekly', 'monthly', 'yearly']).defaultTo('none');
    table.integer('recurrence_interval').defaultTo(1);
    table.date('recurrence_end_date');
    table.uuid('parent_task_id').references('id').inTable('tasks').onDelete('CASCADE');
    
    // Form data
    table.jsonb('form_data').defaultTo('{}');
    table.jsonb('custom_fields').defaultTo('{}');
    
    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['project_id']);
    table.index(['category_id']);
    table.index(['assigned_to']);
    table.index(['created_by']);
    table.index(['status']);
    table.index(['priority']);
    table.index(['due_date']);
    table.index(['recurrence_type']);
    table.index(['parent_task_id']);
  });

  // Task assignments history
  await knex.schema.createTable('task_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('assigned_by').references('id').inTable('users').onDelete('CASCADE');
    table.text('notes');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('unassigned_at');
    
    // Indexes
    table.index(['task_id']);
    table.index(['user_id']);
    table.index(['assigned_by']);
    table.index(['assigned_at']);
  });

  // Task comments and updates
  await knex.schema.createTable('task_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('comment').notNullable();
    table.enum('type', ['comment', 'status_change', 'assignment', 'attachment']).defaultTo('comment');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['task_id']);
    table.index(['user_id']);
    table.index(['type']);
    table.index(['created_at']);
  });

  // File attachments
  await knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('uploaded_by').references('id').inTable('users').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('original_filename').notNullable();
    table.string('mime_type');
    table.integer('file_size');
    table.string('file_path').notNullable();
    table.string('file_hash');
    
    // Geospatial metadata for images
    table.specificType('geo_location', 'geometry(Point, 4326)');
    table.jsonb('exif_data').defaultTo('{}');
    table.timestamp('taken_at');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['task_id']);
    table.index(['uploaded_by']);
    table.index(['mime_type']);
    table.index(['taken_at']);
  });

  // Create spatial indexes
  await knex.raw('CREATE INDEX idx_projects_bounds ON projects USING GIST (project_bounds)');
  await knex.raw('CREATE INDEX idx_tasks_location ON tasks USING GIST (location)');
  await knex.raw('CREATE INDEX idx_tasks_work_area ON tasks USING GIST (work_area)');
  await knex.raw('CREATE INDEX idx_attachments_geo ON attachments USING GIST (geo_location)');

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  
  await knex.raw(`
    CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
  await knex.raw('DROP TRIGGER IF EXISTS update_projects_updated_at ON projects');
  await knex.raw('DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.dropTableIfExists('task_assignments');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('task_categories');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('users');
}