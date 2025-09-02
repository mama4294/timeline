# Factory Scheduling App Implementation Plan

## Phase 1: Project Setup and Foundation

1. Initialize Power Apps Code App with Vite and TypeScript
2. Set up Fluent UI v9 infrastructure
3. Configure basic project structure and routing
4. Implement mock data services and interfaces

## Phase 2: Core Timeline Component

1. Implement base Timeline grid component

   - X-axis time representation
   - Y-axis equipment rows
   - Zoom levels (hourly, daily, weekly, yearly)
   - Horizontal and vertical scrolling
   - Current time indicator
   - Auto-updating current time bar
   - "Jump to now" functionality

2. Develop viewport management
   - Virtual scrolling for performance
   - Viewport calculation based on zoom level
   - Efficient re-rendering strategy

## Phase 3: Equipment Management

1. Create Equipment management service

   - Equipment CRUD operations
   - Data models and interfaces
   - Mock implementation first

2. Build Equipment UI components
   - Equipment list view
   - Add/Edit/Delete equipment forms
   - Equipment filtering
   - Y-axis equipment representation

## Phase 4: Operation Management

1. Implement Operation service

   - Operation CRUD operations
   - Batch management
   - Validation logic for overlaps
   - Color management for batches

2. Create Operation UI components

   - Operation creation/edit forms
   - Drag-and-drop operation blocks
   - Resize handles
   - Batch color management
   - Operation filtering by batch
   - Validation visualizations

3. Develop Batch management
   - Batch CRUD operations
   - Batch color assignment
   - Multi-operation movement
   - Batch filtering

## Phase 5: Edit/View Mode Toggle

1. Implement mode toggle functionality

   - Global edit/view mode state
   - Mode toggle UI component
   - View mode read-only restrictions
   - Edit mode full functionality

2. Add mode-specific UI adaptations
   - Hide edit controls in view mode
   - Visual indicators of current mode
   - Smooth transitions between modes
   - Proper state management for mode changes

## Phase 6: Performance Optimization

1. Implement data optimization

   - Pagination for large datasets
   - Data caching strategy
   - Lazy loading for historical data

2. UI performance improvements
   - Component memoization
   - Render optimization
   - Animation performance

## Phase 7: Testing and Polish

1. Comprehensive testing

   - Unit tests for core logic
   - Integration tests for drag-drop
   - Performance testing with large datasets
   - Cross-browser testing

2. UI polish
   - Responsive design verification
   - Animation smoothness
   - Loading states
   - Error handling
   - Accessibility compliance

## Technical Architecture

### Core Components

1. `TimelineGrid`: Main visualization component
2. `EquipmentList`: Equipment management
3. `OperationBlock`: Draggable operation representation
4. `TimelineControls`: Zoom and navigation controls

### Services

1. `DataProviderService`: Manages data source switching (Mock/Dataverse)
2. `EquipmentService`: Equipment CRUD operations
3. `OperationService`: Operation management
4. `BatchService`: Batch management
5. `TimelineService`: Timeline calculations and viewport management
6. `ModeService`: Edit/View mode management

### Data Models

1. `Equipment`: Properties for equipment management
2. `Operation`: Operation scheduling data
3. `Batch`: Batch management data
4. `TimelineViewport`: Current view state
5. `AppMode`: Edit/View mode state

### State Management

- Use React Context for global state
- Implement proper data caching
- Optimize re-renders with proper state splitting

### UI/UX Considerations

- Implement skeleton loading states
- Add proper error boundaries
- Include operation tooltips
- Provide keyboard navigation
- Ensure WCAG compliance

## Data Layer Design

### Mock Data Structure

Initially implement in-memory data structures that mirror Dataverse tables:

```typescript
interface Equipment {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdOn: Date;
  modifiedOn: Date;
}

interface Operation {
  id: string;
  equipmentId: string;
  batchId: string | null;
  startTime: Date;
  endTime: Date;
  type: string;
  description: string;
  createdOn: Date;
  modifiedOn: Date;
}

interface Batch {
  id: string;
  batchNumber: string;
  color: string;
  description: string;
  createdOn: Date;
  modifiedOn: Date;
}
```

### Dataverse Table Schema

When transitioning to production, create corresponding Dataverse tables:

#### Equipment Table (mml_equipment)

- Primary Column: Name (Text)
- Description (Text)
- Is Active (Two Options)
- - Standard System Columns

#### Operation Table (mml_operation)

- Equipment (Lookup to Equipment)
- Batch (Lookup to Batch)
- Start Time (DateTime)
- End Time (DateTime)
- Type (Choice)
- Description (Text)
- - Standard System Columns

#### Batch Table (mml_batch)

- Batch Number (Text)
- Color (Text)
- Description (Text)
- - Standard System Columns

### Data Access Layer

Implement a provider pattern to switch between mock and Dataverse data:

```typescript
interface IDataProvider {
    equipment: IEquipmentRepository;
    operations: IOperationRepository;
    batches: IBatchRepository;
}

// Implementation examples:
class MockDataProvider implements IDataProvider { ... }
class DataverseDataProvider implements IDataProvider { ... }
```

## Development Approach

1. Start with mock data provider

   - Implement in-memory data structures
   - Add mock data generation
   - Simulate network delays and errors

2. Implement core UI components

   - Use mock data provider for development
   - Ensure components are data-source agnostic

3. Add drag-drop functionality

   - Test with mock data first
   - Implement optimistic updates

4. Create Dataverse integration

   - Set up Dataverse tables
   - Implement Dataverse data provider
   - Add environment switching (mock/Dataverse)
   - Test data migration process

5. Performance optimization

   - Implement caching strategies
   - Add batch operations for Dataverse
   - Optimize queries and views

6. Polish UI/UX
   - Add loading states
   - Improve error handling
   - Refine animations

## Next Steps

1. Set up initial project structure
2. Create mock data services
3. Build basic Timeline component
4. Implement equipment management
