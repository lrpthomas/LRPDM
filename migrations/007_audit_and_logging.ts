import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Activity logs table - comprehensive audit trail
  await knex.schema.createTable('activity_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Actor information
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('user_email'); // Backup in case user is deleted
    table.string('user_role');
    
    // Action details
    table.enum('action_type', [
      'create', 'read', 'update', 'delete', 'login', 'logout', 
      'assign', 'unassign', 'approve', 'reject', 'archive', 
      'export', 'import', 'sync', 'upload', 'download'
    ]).notNullable();
    
    // Target entity
    table.string('entity_type').notNullable(); // tasks, projects, users, forms, etc.
    table.uuid('entity_id'); // ID of the affected entity
    table.string('entity_name'); // Human-readable name/title
    
    // Change details
    table.jsonb('old_values').defaultTo('{}'); // Previous state
    table.jsonb('new_values').defaultTo('{}'); // New state
    table.jsonb('metadata').defaultTo('{}'); // Additional context
    
    // Request context
    table.string('ip_address');
    table.string('user_agent');
    table.string('session_id');
    table.string('request_id'); // For tracing requests
    
    // Geospatial context
    table.specificType('location', 'geometry(Point, 4326)'); // Where action occurred
    table.string('device_info');
    
    // Risk and compliance
    table.enum('risk_level', ['low', 'medium', 'high', 'critical']).defaultTo('low');
    table.boolean('requires_approval').defaultTo(false);
    table.boolean('is_sensitive').defaultTo(false);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['user_id']);
    table.index(['action_type']);
    table.index(['entity_type']);
    table.index(['entity_id']);
    table.index(['created_at']);
    table.index(['risk_level']);
    table.index(['ip_address']);
    table.index(['session_id']);
    table.index(['requires_approval']);
  });

  // System events and errors
  await knex.schema.createTable('system_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    table.enum('event_type', [
      'system_startup', 'system_shutdown', 'database_migration', 
      'backup_created', 'backup_restored', 'data_sync', 'performance_alert',
      'security_alert', 'error', 'warning', 'info'
    ]).notNullable();
    
    table.enum('severity', ['debug', 'info', 'warning', 'error', 'critical']).notNullable();
    
    table.string('component'); // Which system component generated the event
    table.string('message').notNullable();
    table.text('stack_trace');
    table.jsonb('event_data').defaultTo('{}');
    
    // Performance metrics
    table.integer('response_time_ms');
    table.integer('memory_usage_mb');
    table.integer('cpu_usage_percent');
    
    // Resolution tracking
    table.enum('status', ['open', 'investigating', 'resolved', 'ignored']).defaultTo('open');
    table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at');
    table.text('resolution_notes');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['event_type']);
    table.index(['severity']);
    table.index(['component']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Data quality and validation logs
  await knex.schema.createTable('data_quality_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Data source
    table.enum('data_type', ['form_submission', 'csv_import', 'api_data', 'manual_entry']).notNullable();
    table.uuid('source_id'); // ID of form, import job, etc.
    table.string('source_name');
    
    // Quality check details
    table.enum('check_type', [
      'completeness', 'accuracy', 'consistency', 'validity', 
      'spatial_validation', 'business_rules', 'duplicate_check'
    ]).notNullable();
    
    table.enum('result', ['passed', 'warning', 'failed']).notNullable();
    table.string('rule_name');
    table.text('description');
    table.jsonb('failed_records').defaultTo('{}'); // Details of failed validation
    table.integer('total_records');
    table.integer('passed_records');
    table.integer('failed_records_count');
    
    // Auto-correction
    table.boolean('auto_corrected').defaultTo(false);
    table.jsonb('corrections_applied').defaultTo('{}');
    
    table.timestamp('checked_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['data_type']);
    table.index(['check_type']);
    table.index(['result']);
    table.index(['checked_at']);
    table.index(['source_id']);
  });

  // Security events
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    table.enum('event_type', [
      'login_attempt', 'login_failure', 'password_change', 'permission_denied',
      'suspicious_activity', 'data_breach_attempt', 'malware_detected',
      'unauthorized_access', 'privilege_escalation', 'data_export'
    ]).notNullable();
    
    table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
    
    // Actor (may be unknown for attacks)
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('attempted_user'); // Username attempted in failed logins
    
    // Context
    table.string('ip_address');
    table.string('user_agent');
    table.string('session_id');
    table.jsonb('request_details').defaultTo('{}');
    
    // Response
    table.enum('response_action', ['blocked', 'allowed', 'flagged', 'investigated']).notNullable();
    table.boolean('requires_investigation').defaultTo(false);
    table.uuid('investigated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('investigated_at');
    table.text('investigation_notes');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['event_type']);
    table.index(['severity']);
    table.index(['user_id']);
    table.index(['ip_address']);
    table.index(['response_action']);
    table.index(['requires_investigation']);
    table.index(['created_at']);
  });

  // Performance monitoring
  await knex.schema.createTable('performance_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Metric details
    table.string('metric_name').notNullable(); // endpoint_response_time, db_query_time, etc.
    table.string('category'); // api, database, frontend, etc.
    table.float('value').notNullable();
    table.string('unit'); // ms, seconds, bytes, etc.
    
    // Context
    table.string('endpoint');
    table.string('query_type');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('session_id');
    
    // Geospatial performance
    table.specificType('query_bounds', 'geometry(Polygon, 4326)'); // For spatial query performance
    table.integer('feature_count'); // Number of features in spatial query
    
    // Threshold monitoring
    table.float('threshold_warning');
    table.float('threshold_critical');
    table.boolean('exceeds_threshold').defaultTo(false);
    
    table.timestamp('measured_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['metric_name']);
    table.index(['category']);
    table.index(['endpoint']);
    table.index(['exceeds_threshold']);
    table.index(['measured_at']);
    table.index(['user_id']);
  });

  // Create spatial indexes
  await knex.raw('CREATE INDEX idx_activity_logs_location ON activity_logs USING GIST (location)');
  await knex.raw('CREATE INDEX idx_performance_query_bounds ON performance_metrics USING GIST (query_bounds)');

  // Create audit trigger function for automatic logging
  await knex.raw(`
    CREATE OR REPLACE FUNCTION log_data_changes()
    RETURNS TRIGGER AS $$
    DECLARE
        old_data JSONB;
        new_data JSONB;
        action_type TEXT;
        table_name TEXT;
    BEGIN
        table_name := TG_TABLE_NAME;
        
        IF TG_OP = 'DELETE' THEN
            old_data := row_to_json(OLD)::JSONB;
            new_data := '{}'::JSONB;
            action_type := 'delete';
        ELSIF TG_OP = 'UPDATE' THEN
            old_data := row_to_json(OLD)::JSONB;
            new_data := row_to_json(NEW)::JSONB;
            action_type := 'update';
        ELSIF TG_OP = 'INSERT' THEN
            old_data := '{}'::JSONB;
            new_data := row_to_json(NEW)::JSONB;
            action_type := 'create';
        END IF;

        -- Log to activity_logs (we'll need to set user context separately)
        INSERT INTO activity_logs (
            action_type, entity_type, entity_id, old_values, new_values, created_at
        ) VALUES (
            action_type::activity_logs_action_type_enum,
            table_name,
            COALESCE(NEW.id, OLD.id),
            old_data,
            new_data,
            NOW()
        );

        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create audit triggers for key tables (we'll add more as needed)
  await knex.raw(`
    CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();
  `);

  await knex.raw(`
    CREATE TRIGGER audit_tasks_changes
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();
  `);

  await knex.raw(`
    CREATE TRIGGER audit_projects_changes
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_data_changes();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS audit_users_changes ON users');
  await knex.raw('DROP TRIGGER IF EXISTS audit_tasks_changes ON tasks');
  await knex.raw('DROP TRIGGER IF EXISTS audit_projects_changes ON projects');
  await knex.raw('DROP FUNCTION IF EXISTS log_data_changes()');

  // Drop tables
  await knex.schema.dropTableIfExists('performance_metrics');
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('data_quality_logs');
  await knex.schema.dropTableIfExists('system_events');
  await knex.schema.dropTableIfExists('activity_logs');
}