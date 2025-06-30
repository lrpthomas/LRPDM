import { FastifyInstance } from 'fastify';
import { CSVUploadController } from '../controllers/csvUploadController';

export default async function csvUploadRoutes(fastify: FastifyInstance) {
  // Register multipart content parsing
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
      files: 1
    }
  });

  // CSV upload preview endpoint
  fastify.post('/api/csv/preview', {
    schema: {
      consumes: ['multipart/form-data'],
      summary: 'Preview CSV file before import',
      description: 'Upload a CSV file to preview its structure and get suggested field mappings',
      tags: ['CSV Upload'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                headers: { 
                  type: 'array',
                  items: { type: 'string' }
                },
                preview: {
                  type: 'array',
                  items: { type: 'object' }
                },
                rowCount: { type: 'number' },
                suggestedFieldMapping: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      sourceField: { type: 'string' },
                      targetField: { type: 'string' },
                      type: { 
                        type: 'string',
                        enum: ['string', 'number', 'coordinate', 'date', 'geometry']
                      }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' }
              }
            },
            success: { type: 'boolean', const: false }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            },
            success: { type: 'boolean', const: false }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      // Handle file upload
      const data = await request.file();
      if (data) {
        request.file = data;
      }
    }
  }, CSVUploadController.previewCSV);

  // CSV upload and import endpoint
  fastify.post('/api/csv/upload', {
    schema: {
      consumes: ['multipart/form-data'],
      summary: 'Upload and import CSV file',
      description: 'Upload a CSV file with field mappings to import into the database',
      tags: ['CSV Upload'],
      body: {
        type: 'object',
        properties: {
          datasetName: { 
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Name for the new dataset'
          },
          description: { 
            type: 'string',
            maxLength: 1000,
            description: 'Optional description for the dataset'
          },
          fieldMapping: { 
            type: 'string',
            description: 'JSON string of field mapping configuration'
          },
          batchSize: { 
            type: 'number',
            minimum: 1,
            maximum: 1000,
            default: 100,
            description: 'Number of rows to process in each batch'
          }
        },
        required: ['datasetName', 'fieldMapping']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                datasetId: { type: 'string' },
                layerId: { type: 'string' },
                featuresImported: { type: 'number' },
                totalRows: { type: 'number' },
                errors: { 
                  type: 'array',
                  items: { type: 'object' }
                },
                warnings: {
                  type: 'array',
                  items: { type: 'string' }
                },
                processingTime: { type: 'string' },
                performance: {
                  type: 'object',
                  properties: {
                    rowsPerSecond: { type: 'number' },
                    averageRowProcessingTime: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
                field: { type: 'string' },
                details: { type: 'object' }
              }
            },
            success: { type: 'boolean', const: false }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            },
            success: { type: 'boolean', const: false }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      // Handle file upload
      const data = await request.file();
      if (data) {
        request.file = data;
      }
    }
  }, CSVUploadController.uploadCSV);

  // Get import session status
  fastify.get('/api/csv/import/:sessionId/status', {
    schema: {
      summary: 'Get import session status',
      description: 'Check the status of a CSV import session',
      tags: ['CSV Upload'],
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' }
        },
        required: ['sessionId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { 
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed']
                },
                totalRows: { type: 'number' },
                processedRows: { type: 'number' },
                errorCount: { type: 'number' },
                percentage: { type: 'number' },
                startedAt: { type: 'string' },
                completedAt: { type: 'string' },
                errors: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    
    try {
      // Query import session from database
      const session = await fastify.db('import_sessions')
        .where('id', sessionId)
        .first();

      if (!session) {
        return reply.status(404).send({
          error: {
            type: 'validation',
            message: 'Import session not found',
            code: 'SESSION_NOT_FOUND'
          },
          success: false
        });
      }

      const percentage = session.total_rows > 0 
        ? Math.round((session.processed_rows / session.total_rows) * 100)
        : 0;

      reply.send({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          totalRows: session.total_rows,
          processedRows: session.processed_rows,
          errorCount: session.error_count,
          percentage,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          errors: session.errors ? JSON.parse(session.errors) : []
        }
      });

    } catch (error) {
      fastify.log.error('Import status check error:', error);
      reply.status(500).send({
        error: {
          type: 'database',
          message: 'Failed to get import status',
          code: 'DATABASE_ERROR'
        },
        success: false
      });
    }
  });

  // List recent import sessions
  fastify.get('/api/csv/imports', {
    schema: {
      summary: 'List recent import sessions',
      description: 'Get a list of recent CSV import sessions',
      tags: ['CSV Upload'],
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          offset: {
            type: 'number',
            minimum: 0,
            default: 0
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed']
          }
        }
      }
    }
  }, async (request, reply) => {
    const { limit = 20, offset = 0, status } = request.query as any;
    
    try {
      let query = fastify.db('import_sessions')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where('status', status);
      }

      const sessions = await query;
      const total = await fastify.db('import_sessions')
        .count('* as count')
        .where(status ? { status } : {})
        .first();

      reply.send({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            ...session,
            errors: session.errors ? JSON.parse(session.errors) : [],
            fieldMapping: session.field_mapping ? JSON.parse(session.field_mapping) : []
          })),
          pagination: {
            total: total?.count || 0,
            limit,
            offset,
            hasMore: (total?.count || 0) > offset + limit
          }
        }
      });

    } catch (error) {
      fastify.log.error('Import sessions list error:', error);
      reply.status(500).send({
        error: {
          type: 'database',
          message: 'Failed to fetch import sessions',
          code: 'DATABASE_ERROR'
        },
        success: false
      });
    }
  });
}