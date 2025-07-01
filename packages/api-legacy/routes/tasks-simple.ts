import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db as knex } from '../config/database';

const router: Router = Router();

// Get all tasks (simplified)
router.get('/', async (req: Request, res: Response) => {
  try {
    const tasks = await knex('tasks')
      .select('*')
      .limit(50)
      .orderBy('created_at', 'desc');

    res.json({ tasks });

  } catch (error) {
    console.error('Get tasks error:', error);
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
      .where('id', taskId)
      .first();

    if (!task) {
      res.status(404).json({
        error: 'Task not found'
      });
      return;
    }

    res.json({ task });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Failed to retrieve task'
    });
  }
});

// Create new task (simplified)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, projectId, status = 'pending', priority = 'medium' } = req.body;
    
    const [task] = await knex('tasks')
      .insert({
        title,
        description,
        project_id: projectId,
        status,
        priority,
        created_by: req.body.createdBy || '00000000-0000-0000-0000-000000000000' // Placeholder
      })
      .returning('*');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Failed to create task'
    });
  }
});

// Update task status
router.put('/:taskId/status', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    const [updatedTask] = await knex('tasks')
      .where('id', taskId)
      .update({ status, updated_at: knex.fn.now() })
      .returning('*');

    if (!updatedTask) {
      res.status(404).json({
        error: 'Task not found'
      });
      return;
    }

    res.json({
      message: 'Task status updated',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
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