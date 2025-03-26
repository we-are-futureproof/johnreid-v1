# UMC Property Analysis Map - Project Tracker

## Project Overview
A web application that overlays Qualified Census Tracts (QCT) and Difficult Development Areas (DDA) with United Methodist Church (UMC) locations, and incorporates Area Median Income (AMI) data from HUD for market targeting.

## Key Terms
- **QCT**: Qualified Census Tract - Census tracts designated by HUD where 50% or more of households have incomes below 60% of the Area Median Gross Income
- **DDA**: Difficult Development Area - Areas with high construction, land, and utility costs relative to area median income
- **UMC**: United Methodist Church
- **AMI**: Area Median Income - The midpoint of a region's income distribution
- **HUD**: U.S. Department of Housing and Urban Development

## Project Requirements
1. Overlay QCT/DDA Zones with UMC Locations
2. Utilize Low-Mod Income data to help target specific markets
3. Ensure reliable geocoding for UMC locations in the Nashville area

## Project Roadmap

### Phase 1: Project Setup and Basic Infrastructure
- [x] Define project requirements and scope
- [x] Set up project repository and structure
- [x] Create basic README.md with project information
- [x] Set up development environment
- [x] Configure Supabase connection
- [x] Create initial frontend application structure

### Phase 2: Data Integration
- [x] Connect to Supabase database
- [x] Create data models for UMC properties
- [x] Integrate QCT/DDA zone data
- [x] Integrate Low-Mod Income data
- [x] Set up data fetching services
- [x] Create SQL functions with spatial filtering

### Phase 3: Map Implementation
- [x] Research and select appropriate mapping library (Mapbox GL)
- [x] Implement basic map display
- [x] Add UMC property markers to map
- [x] Overlay QCT/DDA zones on map
- [x] Implement property information display

### Phase 4: Filtering and Analysis Features
- [x] Implement UMC location geocoding (frontend fallback)
- [x] Implement batch geocoding system for database
- [x] Create filtering UI components
- [ ] Implement search functionality
- [ ] Add data export capabilities

### Phase 5: UI/UX Refinement
- [x] Design and implement responsive UI
- [x] Add user-friendly controls
- [ ] Implement accessibility features
- [x] Optimize performance
- [x] Improve map interaction handling for overlays
- [ ] Add helpful tooltips and instructions

### Phase 6: Testing and Deployment
- [x] Test database queries and optimize for performance
- [ ] Implement unit and integration tests
- [x] Fix bugs and address feedback
- [ ] Deploy application to production
- [x] Create documentation for development

## Technology Stack
- **Frontend**: React with TypeScript using Vite
- **Mapping**: Mapbox GL JS via react-map-gl
- **Database**: Supabase with PostgreSQL + PostGIS extension
- **Styling**: Tailwind CSS
- **Deployment**: To be determined

## Current Status
The application has a functional map displaying UMC locations in the Nashville area, along with Qualified Census Tracts (QCT) and Difficult Development Areas (DDA). UMC locations are geocoded using two complementary approaches:

1. A comprehensive batch geocoding system for processing the entire UMC database with Mapbox API integration
2. A reliable frontend fallback system for Nashville churches ensuring consistent data display

The batch geocoding system includes robust error handling, memory management for large datasets, detailed progress reporting, and database integration.

Recent improvements include proper map click handling for QCT and DDA zones with an interactive layers approach, removal of placeholder land area data, and optimization of Mapbox telemetry to reduce console errors.

## Key Achievements
1. **Optimized Supabase Queries**: Implemented spatial filtering for QCT and DDA zones to improve performance and prevent timeouts
2. **Comprehensive Geocoding Solution**: Developed a dual-approach geocoding system with:
   - A batch processing system for the full UMC database with Mapbox API integration
   - A Nashville-focused frontend fallback system for reliable map display
3. **Interactive Map**: Created an interactive map with layer toggles and property filtering
4. **Memory-Efficient Processing**: Implemented strategies for handling large datasets with optimized memory usage
5. **Improved Map Interactions**: Implemented proper map click handling for QCT and DDA zones using Mapbox interactiveLayerIds
6. **Data Integrity**: Removed placeholder land area data to ensure only verified information is displayed
7. **Performance Optimization**: Configured Mapbox to reduce telemetry and tracking requests

## Next Steps
1. Test the application with more real-world data
2. Refine the batch geocoding system with address normalization preprocessing
3. Add search functionality for specific UMC properties
4. Implement additional filtering options and data visualization
5. Develop a UI for manual verification and correction of low-confidence geocoding results
6. Collect and integrate accurate land area data when available
7. Further optimize Mapbox configuration to enhance performance
