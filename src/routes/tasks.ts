import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db as knex } from '../config/database';

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  workArea: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number().array())))
  }).optional(),
  address: z.string().optional(),
  formData: z.record(z.any()).default({}),
  customFields: z.record(z.any()).default({})
});

const updateTaskSchema = createTaskSchema.partial();

const taskQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  categoryId: z.string().uuid().optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  createdAfter: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeLocation: z.string().transform(val => val === 'true').optional()
});

// Get all tasks with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const params = taskQuerySchema.parse(req.query);
    
    let query = knex('tasks')
      .select([
        'tasks.*',
        'projects.name as project_name',
        'task_categories.name as category_name',
        'task_categories.color as category_color',
        'assigned_user.username as assigned_username',
        'assigned_user.first_name as assigned_first_name',
        'assigned_user.last_name as assigned_last_name',
        'creator.username as creator_username'
      ])
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .leftJoin('task_categories', 'tasks.category_id', 'task_categories.id')
      .leftJoin('users as assigned_user', 'tasks.assigned_to', 'assigned_user.id')
      .leftJoin('users as creator', 'tasks.created_by', 'creator.id');

    // Apply filters
    if (params.projectId) {
      query = query.where('tasks.project_id', params.projectId);
    }
    
    if (params.assignedTo) {
      query = query.where('tasks.assigned_to', params.assignedTo);
    }
    
    if (params.status) {
      query = query.where('tasks.status', params.status);
    }
    
    if (params.priority) {
      query = query.where('tasks.priority', params.priority);
    }
    
    if (params.categoryId) {
      query = query.where('tasks.category_id', params.categoryId);
    }
    
    if (params.dueBefore) {
      query = query.where('tasks.due_date', '<=', params.dueBefore);
    }
    
    if (params.dueAfter) {
      query = query.where('tasks.due_date', '>=', params.dueAfter);
    }
    
    if (params.createdBefore) {
      query = query.where('tasks.created_at', '<=', params.createdBefore);
    }
    
    if (params.createdAfter) {
      query = query.where('tasks.created_at', '>=', params.createdAfter);
    }
    
    if (params.search) {
      query = query.where(function() {
        this.whereILike('tasks.title', `%${params.search}%`)
          .orWhereILike('tasks.description', `%${params.search}%`)
          .orWhereILike('tasks.address', `%${params.search}%`);
      });
    }

    // Add location data if requested
    if (params.includeLocation) {
      query = query.select([
        'tasks.*',
        'projects.name as project_name',
        'task_categories.name as category_name',
        'task_categories.color as category_color',
        'assigned_user.username as assigned_username',
        'assigned_user.first_name as assigned_first_name',
        'assigned_user.last_name as assigned_last_name',
        'creator.username as creator_username',
        knex.raw('ST_AsGeoJSON(tasks.location)::json as location_geojson'),
        knex.raw('ST_AsGeoJSON(tasks.work_area)::json as work_area_geojson')
      ]);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().count('* as count').first();
    
    // Apply sorting and pagination
    query = query
      .orderBy(`tasks.${params.sortBy}`, params.sortOrder)
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    const [tasks, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      project: {
        id: task.project_id,
        name: task.project_name
      },
      category: task.category_id ? {
        id: task.category_id,
        name: task.category_name,
        color: task.category_color
      } : null,
      assignedTo: task.assigned_to ? {
        id: task.assigned_to,
        username: task.assigned_username,
        firstName: task.assigned_first_name,
        lastName: task.assigned_last_name
      } : null,
      createdBy: {
        id: task.created_by,
        username: task.creator_username
      },
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      startedAt: task.started_at,
      completedAt: task.completed_at,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      location: params.includeLocation ? task.location_geojson : undefined,
      workArea: params.includeLocation ? task.work_area_geojson : undefined,
      address: task.address,
      recurrenceType: task.recurrence_type,
      recurrenceInterval: task.recurrence_interval,
      recurrenceEndDate: task.recurrence_end_date,
      parentTaskId: task.parent_task_id,
      formData: task.form_data,
      customFields: task.custom_fields,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json({
      tasks: formattedTasks,
      pagination: {
        total: parseInt((countResult as any).count),
        limit: params.limit || 50,
        offset: params.offset || 0,
        hasMore: (params.offset || 0) + (params.limit || 50) < parseInt((countResult as any).count)
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to retrieve tasks'
    });
  }
});

// Get single task by ID
router.get('/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const task = await knex('tasks')
      .select([
        'tasks.*',
        'projects.name as project_name',
        'task_categories.name as category_name',
        'task_categories.color as category_color',
        'assigned_user.username as assigned_username',
        'assigned_user.first_name as assigned_first_name',
        'assigned_user.last_name as assigned_last_name',
        'creator.username as creator_username',
        knex.raw('ST_AsGeoJSON(tasks.location)::json as location_geojson'),
        knex.raw('ST_AsGeoJSON(tasks.work_area)::json as work_area_geojson')
      ])
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .leftJoin('task_categories', 'tasks.category_id', 'task_categories.id')
      .leftJoin('users as assigned_user', 'tasks.assigned_to', 'assigned_user.id')
      .leftJoin('users as creator', 'tasks.created_by', 'creator.id')
      .where('tasks.id', taskId)
      .first();

    if (!task) {
      res.status(404).json({
        error: 'Task not found'
      });
      return;
    }

    res.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        project: {
          id: task.project_id,
          name: task.project_name
        },
        category: task.category_id ? {
          id: task.category_id,
          name: task.category_name,
          color: task.category_color
        } : null,
        assignedTo: task.assigned_to ? {
          id: task.assigned_to,
          username: task.assigned_username,
          firstName: task.assigned_first_name,
          lastName: task.assigned_last_name
        } : null,
        createdBy: {
          id: task.created_by,
          username: task.creator_username
        },
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        startedAt: task.started_at,
        completedAt: task.completed_at,
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        location: task.location_geojson,
        workArea: task.work_area_geojson,
        address: task.address,
        recurrenceType: task.recurrence_type,
        recurrenceInterval: task.recurrence_interval,
        recurrenceEndDate: task.recurrence_end_date,
        parentTaskId: task.parent_task_id,
        formData: task.form_data,
        customFields: task.custom_fields,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Failed to retrieve task'
    });
  }
});

// Create new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const taskData = createTaskSchema.parse(req.body);
    
    // Build the task record
    const taskRecord: any = {
      title: taskData.title,
      description: taskData.description,
      project_id: taskData.projectId,
      category_id: taskData.categoryId,
      assigned_to: taskData.assignedTo,
      created_by: req.body.createdBy, // Should come from auth middleware
      status: taskData.status,
      priority: taskData.priority,
      due_date: taskData.dueDate,
      estimated_hours: taskData.estimatedHours,
      address: taskData.address,
      form_data: taskData.formData,
      custom_fields: taskData.customFields
    };

    // Add location if provided
    if (taskData.location) {
      taskRecord.location = knex.raw(
        'ST_SetSRID(ST_MakePoint(?, ?), 4326)',
        [taskData.location.longitude, taskData.location.latitude]
      );
    }

    // Add work area if provided
    if (taskData.workArea) {
      taskRecord.work_area = knex.raw(
        'ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)',
        [JSON.stringify(taskData.workArea)]
      );
    }

    const [task] = await knex('tasks')
      .insert(taskRecord)
      .returning('*');

    res.status(201).json({
      message: 'Task created successfully',
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        projectId: task.project_id,
        categoryId: task.category_id,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        estimatedHours: task.estimated_hours,
        address: task.address,
        formData: task.form_data,
        customFields: task.custom_fields,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }
    });

  } catch (error) {
    console.error('Create task error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to create task'
    });
  }
});

// Update task
router.put('/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = updateTaskSchema.parse(req.body);
    
    // Check if task exists
    const existingTask = await knex('tasks').where('id', taskId).first();
    if (!existingTask) {
      res.status(404).json({
        error: 'Task not found'
      });
      return;
    }

    // Build update record
    const updateRecord: any = {};
    
    if (updates.title !== undefined) updateRecord.title = updates.title;
    if (updates.description !== undefined) updateRecord.description = updates.description;
    if (updates.categoryId !== undefined) updateRecord.category_id = updates.categoryId;
    if (updates.assignedTo !== undefined) updateRecord.assigned_to = updates.assignedTo;
    if (updates.status !== undefined) {
      updateRecord.status = updates.status;
      // Set timestamps based on status changes
      if (updates.status === 'in_progress' && !existingTask.started_at) {
        updateRecord.started_at = knex.fn.now();
      }
      if (updates.status === 'completed' && !existingTask.completed_at) {
        updateRecord.completed_at = knex.fn.now();
      }
    }
    if (updates.priority !== undefined) updateRecord.priority = updates.priority;
    if (updates.dueDate !== undefined) updateRecord.due_date = updates.dueDate;
    if (updates.estimatedHours !== undefined) updateRecord.estimated_hours = updates.estimatedHours;
    if (updates.address !== undefined) updateRecord.address = updates.address;
    if (updates.formData !== undefined) updateRecord.form_data = updates.formData;
    if (updates.customFields !== undefined) updateRecord.custom_fields = updates.customFields;

    // Add location if provided
    if (updates.location) {
      updateRecord.location = knex.raw(
        'ST_SetSRID(ST_MakePoint(?, ?), 4326)',
        [updates.location.longitude, updates.location.latitude]
      );
    }

    // Add work area if provided
    if (updates.workArea) {
      updateRecord.work_area = knex.raw(
        'ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)',
        [JSON.stringify(updates.workArea)]
      );
    }

    const [updatedTask] = await knex('tasks')
      .where('id', taskId)
      .update(updateRecord)
      .returning('*');

    res.json({
      message: 'Task updated successfully',
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        projectId: updatedTask.project_id,
        categoryId: updatedTask.category_id,
        assignedTo: updatedTask.assigned_to,
        status: updatedTask.status,
        priority: updatedTask.priority,
        dueDate: updatedTask.due_date,
        startedAt: updatedTask.started_at,
        completedAt: updatedTask.completed_at,
        estimatedHours: updatedTask.estimated_hours,
        actualHours: updatedTask.actual_hours,
        address: updatedTask.address,
        formData: updatedTask.form_data,
        customFields: updatedTask.custom_fields,
        createdAt: updatedTask.created_at,
        updatedAt: updatedTask.updated_at
      }
    });

  } catch (error) {
    console.error('Update task error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to update task'
    });
  }
});

// Delete task
router.delete('/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const deletedCount = await knex('tasks')
      .where('id', taskId)
      .del();

    if (deletedCount === 0) {
      res.status(404).json({
        error: 'Task not found'
      });
      return;
    }

    res.json({
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Failed to delete task'
    });
  }
});

export default router;