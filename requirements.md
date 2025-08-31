# Factory Scheduling App Requirements

- App Name: operations-timeline

## Timeline View

- As a user, I want to view equipment on rows with time on the X-axis so that I can see operations visually.
- As a user, I want to zoom in and out on the timeline so that I can switch between hourly, daily, weekly, and yearly views.
- As a user, I want to scroll horizontally and vertically so that I can navigate large schedules.
- As a user, I want to see a vertical bar indicating the current time so that I can compare operations against the present moment.
- As a user, I want the current time bar to move automatically as time progresses so that it always stays accurate.
- As a user, I want to quickly jump to the current time so that I don’t get lost when scrolling.

## Equipment Management

- As a user, I want to view all available equipment as rows (e.g., V-3100A, V-3100B, V-3100C) so that I can see their schedules.
- As a user, I want to add equipment to the timeline so that I can schedule new machines or vessels.
- As a user, I want to edit equipment names so that I can keep equipment lists accurate.
- As a user, I want to remove equipment so that the timeline reflects only active resources.
- As a user, I want to filter operations by equipment so that I can focus on one machine at a time.

## Operation Management

- As a user, I want to create an operation by selecting start time, end time, batch number, and equipment so that I can schedule production.
- As a user, I want operations of the same batch to share the same color so that I can easily identify them.
- As a user, I want to assign or change the batch color so that I can control the visualization.
- As a user, I want to edit an operation (start time, end time, batch, equipment) so that I can update schedules.
- As a user, I want to resize an operation by dragging its ends so that I can quickly adjust duration.
- As a user, I want to move an operation by dragging so that I can reschedule quickly.
- As a user, I want to select an entire batch and move all operations together so that I can reschedule full campaigns.
- As a user, I want to delete an operation so that I can remove canceled work.
- As a user, I want to create operations without a batch (e.g., maintenance, cleaning, inspections) so that I can track non-production work.
- As a user, I want to prevent overlapping operations on the same equipment unless explicitly allowed so that the schedule is realistic.
- As a user, I want to filter operations by batch number so that I can track a single production campaign.

## Roles

- As a user (Plant Manager), I want to create, edit, move, and delete operations so that I can manage schedules.
- As a user (Operator), I want to view operations and equipment schedules in read-only mode so that I can execute assigned work.

## Technical

- As a user, I want a modern, consistent UI (Fluent UI v9) so that the app feels professional and familiar.
- As a user, I want drag-and-drop interactions to feel smooth and responsive so that scheduling is efficient.
- As a user, I want the app to handle large datasets (many operations, multiple years) so that performance remains acceptable.
- As a user, I want the app to be web-based and accessible from different devices so that I can use it across the factory.
- Data is accessed through Microsoft Dataverse.
