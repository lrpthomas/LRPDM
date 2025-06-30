import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import GISProcessor from '../utils/gisProcessor';
import GISExporter from '../utils/gisExporter';
import { db as knex } from '../config/database';

export interface BatchJob {
  id: string;
  type: 'import' | 'export' | 'validation' | 'transformation';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  warnings: string[];
  metadata: any;
  results?: any;
}

export interface BatchImportOptions {
  targetCrs?: string;
  validate: boolean;
  maxFeatures?: number;
  tableName: string;
  chunkSize: number;
  validateGeometry: boolean;
  preserveProperties: boolean;
}

export interface BatchExportOptions {
  format: 'geojson' | 'kml' | 'csv' | 'shapefile' | 'gpx';
  sourceTable: string;
  spatialFilter?: any;
  propertyFilter?: any;
  chunkSize: number;
  compress: boolean;
}

class BatchProcessorService {
  private jobs: Map<string, BatchJob> = new Map();
  private maxConcurrentJobs = 3;
  private runningJobs = 0;

  // Create a new batch job
  createJob(type: BatchJob['type'], metadata: any): string {
    const jobId = uuidv4();
    const job: BatchJob = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      warnings: [],
      metadata
    };

    this.jobs.set(jobId, job);
    
    // Start processing if capacity allows
    if (this.runningJobs < this.maxConcurrentJobs) {
      this.processJob(jobId);
    }

    return jobId;
  }

  // Get job status
  getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  // Cancel a job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      this.jobs.set(jobId, job);
      return true;
    }
    return false;
  }

  // Process a job
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    this.runningJobs++;
    job.status = 'processing';
    job.startTime = new Date();
    this.jobs.set(jobId, job);

    try {
      switch (job.type) {
        case 'import':
          await this.processBatchImport(job);
          break;
        case 'export':
          await this.processBatchExport(job);
          break;
        case 'validation':
          await this.processBatchValidation(job);
          break;
        case 'transformation':
          await this.processBatchTransformation(job);
          break;
      }

      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      console.error(`Batch job ${jobId} failed:`, error);
    } finally {
      this.runningJobs--;
      this.jobs.set(jobId, job);
      
      // Start next pending job
      this.startNextPendingJob();
    }
  }

  // Batch import processing
  private async processBatchImport(job: BatchJob): Promise<void> {
    const { filePaths, options }: { filePaths: string[], options: BatchImportOptions } = job.metadata;
    
    job.totalItems = filePaths.length;
    const results: any[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      if (job.status === 'cancelled') break;

      const filePath = filePaths[i];
      
      try {
        // Process the file
        const processingResult = await GISProcessor.processFile(filePath, {
          targetCrs: options.targetCrs,
          validate: options.validate,
          maxFeatures: options.maxFeatures
        });

        if (processingResult.success && processingResult.data) {
          // Import to database in chunks
          const importResult = await this.importGeoJSONInChunks(
            processingResult.data,
            options.tableName,
            options.chunkSize
          );

          results.push({
            file: path.basename(filePath),
            success: true,
            imported: importResult.imported,
            warnings: processingResult.warnings || []
          });

          job.successfulItems++;
        } else {
          results.push({
            file: path.basename(filePath),
            success: false,
            error: processingResult.error
          });

          job.failedItems++;
        }

        // Clean up processed file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

      } catch (error) {
        results.push({
          file: path.basename(filePath),
          success: false,
          error: error.message
        });

        job.failedItems++;
      }

      job.processedItems++;
      job.progress = Math.round((job.processedItems / job.totalItems) * 100);
      this.jobs.set(job.id, job);
    }

    job.results = results;
  }

  // Batch export processing
  private async processBatchExport(job: BatchJob): Promise<void> {
    const { options }: { options: BatchExportOptions } = job.metadata;
    
    // Get total count for progress tracking
    const countResult = await knex(options.sourceTable).count('* as count').first();
    job.totalItems = parseInt((countResult as any).count);

    const exportDir = 'exports/batch';
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportedFiles: string[] = [];
    let offset = 0;

    while (offset < job.totalItems) {
      if (job.status === 'cancelled') break;

      // Export chunk
      const chunk = await this.exportChunkFromDatabase(
        options.sourceTable,
        offset,
        options.chunkSize,
        options.spatialFilter
      );

      if (chunk.features.length > 0) {
        const chunkFileName = `${options.sourceTable}_chunk_${Math.floor(offset / options.chunkSize)}`;
        
        const exportResult = await GISExporter.exportData(chunk, exportDir, {
          format: options.format,
          filename: chunkFileName,
          compress: options.compress
        });

        if (exportResult.success && exportResult.fileName) {
          exportedFiles.push(exportResult.fileName);
        }
      }

      offset += options.chunkSize;
      job.processedItems = Math.min(offset, job.totalItems);
      job.progress = Math.round((job.processedItems / job.totalItems) * 100);
      this.jobs.set(job.id, job);
    }

    job.results = {
      exportedFiles,
      totalFiles: exportedFiles.length,
      exportDirectory: exportDir
    };
  }

  // Batch validation processing
  private async processBatchValidation(job: BatchJob): Promise<void> {
    const { geojsonData }: { geojsonData: any[] } = job.metadata;
    
    job.totalItems = geojsonData.length;
    const validationResults: any[] = [];

    for (let i = 0; i < geojsonData.length; i++) {
      if (job.status === 'cancelled') break;

      const data = geojsonData[i];
      const validation = GISProcessor.validateGeoJSON(data);
      
      validationResults.push({
        index: i,
        validation,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      });

      if (validation.isValid) {
        job.successfulItems++;
      } else {
        job.failedItems++;
      }

      job.processedItems++;
      job.progress = Math.round((job.processedItems / job.totalItems) * 100);
      this.jobs.set(job.id, job);
    }

    job.results = {
      validationResults,
      summary: {
        totalValidated: validationResults.length,
        valid: job.successfulItems,
        invalid: job.failedItems,
        validationRate: (job.successfulItems / validationResults.length) * 100
      }
    };
  }

  // Batch transformation processing
  private async processBatchTransformation(job: BatchJob): Promise<void> {
    const { sourceTable, transformations } = job.metadata;
    
    // Get total count
    const countResult = await knex(sourceTable).count('* as count').first();
    job.totalItems = parseInt((countResult as any).count);

    let processed = 0;
    const chunkSize = 1000;

    while (processed < job.totalItems) {
      if (job.status === 'cancelled') break;

      // Process chunk
      const features = await knex(sourceTable)
        .select('*')
        .limit(chunkSize)
        .offset(processed);

      for (const feature of features) {
        // Apply transformations
        for (const transformation of transformations) {
          switch (transformation.type) {
            case 'buffer':
              await this.applyBufferTransformation(feature.id, transformation.distance);
              break;
            case 'simplify':
              await this.applySimplifyTransformation(feature.id, transformation.tolerance);
              break;
            case 'reproject':
              await this.applyReprojectionTransformation(feature.id, transformation.targetCrs);
              break;
          }
        }
      }

      processed += features.length;
      job.processedItems = processed;
      job.progress = Math.round((processed / job.totalItems) * 100);
      this.jobs.set(job.id, job);
    }

    job.results = {
      transformedFeatures: processed,
      appliedTransformations: transformations.length
    };
  }

  // Helper methods

  private async importGeoJSONInChunks(geojson: any, tableName: string, chunkSize: number): Promise<any> {
    const features = geojson.features || [];
    let imported = 0;

    for (let i = 0; i < features.length; i += chunkSize) {
      const chunk = features.slice(i, i + chunkSize);
      const records = chunk.map((feature: any) => ({
        feature_type: 'batch_imported',
        properties: feature.properties || {},
        geom: knex.raw(
          'ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)',
          [JSON.stringify(feature.geometry)]
        )
      }));

      await knex(tableName).insert(records);
      imported += chunk.length;
    }

    return { imported };
  }

  private async exportChunkFromDatabase(
    tableName: string, 
    offset: number, 
    limit: number, 
    spatialFilter?: any
  ): Promise<any> {
    let query = knex(tableName)
      .select([
        'id',
        'feature_type',
        'properties',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry')
      ])
      .limit(limit)
      .offset(offset);

    if (spatialFilter && spatialFilter.bounds) {
      const [minX, minY, maxX, maxY] = spatialFilter.bounds;
      query = query.whereRaw(`
        ST_Intersects(
          geom,
          ST_MakeEnvelope(?, ?, ?, ?, 4326)
        )
      `, [minX, minY, maxX, maxY]);
    }

    const results = await query;

    const features = results.map((row: any) => ({
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        ...row.properties,
        feature_type: row.feature_type
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  private async applyBufferTransformation(featureId: string, distance: number): Promise<void> {
    await knex('features')
      .where('id', featureId)
      .update({
        geom: knex.raw('ST_Buffer(geom::geography, ?)::geometry', [distance])
      });
  }

  private async applySimplifyTransformation(featureId: string, tolerance: number): Promise<void> {
    await knex('features')
      .where('id', featureId)
      .update({
        geom: knex.raw('ST_Simplify(geom, ?)', [tolerance])
      });
  }

  private async applyReprojectionTransformation(featureId: string, targetCrs: string): Promise<void> {
    // Note: This requires proper CRS setup in PostGIS
    const srid = targetCrs.replace('EPSG:', '');
    await knex('features')
      .where('id', featureId)
      .update({
        geom: knex.raw('ST_Transform(geom, ?)', [srid])
      });
  }

  private startNextPendingJob(): void {
    if (this.runningJobs >= this.maxConcurrentJobs) return;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'pending') {
        this.processJob(jobId);
        break;
      }
    }
  }

  // Cleanup old jobs (call periodically)
  cleanupCompletedJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && job.endTime < cutoff) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Get all jobs
  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  // Get jobs by status
  getJobsByStatus(status: BatchJob['status']): BatchJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }
}

// Singleton instance
export const batchProcessor = new BatchProcessorService();

export default BatchProcessorService;