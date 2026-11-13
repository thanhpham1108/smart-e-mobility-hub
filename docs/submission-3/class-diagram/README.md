# Class diagram handoff

For the current review, see the [combined class inventory](CLASS_INVENTORY.md), the [Smart Charging inventory](05-smart-charging-inventory.md), the [What-if inventory](06-what-if-inventory.md), and the [UML drawing guide](UML_Class_Diagram_Guide.md). The `review/` directory contains visual cleanup copies of diagrams from unmerged team branches; their original sources remain on those branches. All six review images use pale green class-name headers; attributes and operations retain a neutral background.

Keep each feature in its own subfolder. For example, Hub & Identity is in [`hub-identity/`](hub-identity/), with editable PlantUML and a rendered PNG. Use the same feature-folder pattern for the remaining modules as their diagrams are finalized. Use the class ownership in [task_assignment.md](../task_assignment.md). Show essential attributes and state, operation signatures, associations, and multiplicities. Refer to another module's class by name with `<<external>>` and its owner; do not redefine its operations.

Every operation shown must have a matching entry in the module's method catalogue. Keep this design aligned with the use-case scenarios and lifecycle diagrams from Submissions 1–2.
