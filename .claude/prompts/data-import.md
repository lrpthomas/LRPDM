# Data Import Development Prompt

Create a comprehensive data import system that:

1. **File Upload**: Drag-drop interface supporting CSV, Excel, Shapefile, GeoJSON
2. **Data Preview**: Show first 10 rows with detected field types
3. **Field Mapping**: Visual interface to map source → target fields
4. **Validation**: Check for spatial data, required fields, data types
5. **Progress**: Real-time upload/processing progress
6. **Error Handling**: Clear error messages and recovery options

Requirements:
- Works on mobile and desktop
- Handles files up to 100MB
- Uses streaming for large files
- Integrates with PostGIS backend
- Follows our TypeScript patterns