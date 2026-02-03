# Goals Manifest

Index of all available goal workflows.

## Active Goals

| Goal | Purpose | Tools Used | Status |
|------|---------|-----------|--------|
| windsurf_task_submission | Submit coding tasks to Windsurf instances | submit_windsurf_task, wait_windsurf_task | ✅ Active |

## Adding New Goals

When creating a new goal:
1. Follow the template in `ATLAS_CLAUDE.md`
2. Include: Objective, When to Use, Inputs, Outputs, Workflow, Error Handling
3. List all tools used
4. Add to this manifest
5. Update `tools/manifest.md` if using new tools

## Goal Lifecycle

- **Design**: Define objective, inputs, outputs
- **Implementation**: Create goal markdown with full workflow
- **Testing**: Verify with sample inputs
- **Documentation**: Add to manifest
- **Production**: Ready for use
- **Maintenance**: Update when constraints change

*Last updated: Feb 4, 2026*
