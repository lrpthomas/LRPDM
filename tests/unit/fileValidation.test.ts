import { validateFile, SupportedFileType, validateSupportedFileType } from '../../src/utils/fileValidation';

describe('File Validation', () => {
  // Mock Express.Multer.File for testing
  const createMockFile = (filename: string, size: number): Express.Multer.File => ({
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'text/csv',
    size: size,
    destination: '/tmp',
    filename: filename,
    path: `/tmp/${filename}`,
    buffer: Buffer.from('test'),
    stream: null as any
  });

  test('should validate CSV file type', () => {
    const file = createMockFile('test.csv', 1000);
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
    expect(result.fileType).toBe(SupportedFileType.CSV);
  });
  
  test('should validate supported file type', () => {
    const result = validateSupportedFileType('csv');
    expect(result).toBe(SupportedFileType.CSV);
  });
  
  test('should reject invalid file type', () => {
    expect(() => validateSupportedFileType('invalid')).toThrow();
  });
  
  test('should reject oversized files', () => {
    const file = createMockFile('test.csv', 1000000000); // 1GB
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
  });
  
  test('should validate Excel files', () => {
    const file = createMockFile('test.xlsx', 5000);
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
    expect(result.fileType).toBe(SupportedFileType.EXCEL);
  });
});