# Class diagram handoff

For the current review, see the [combined class inventory](CLASS_INVENTORY.md), the [Smart Charging inventory](smart-charging/05-smart-charging-inventory.md), the [What-if inventory](what-if/06-what-if-inventory.md), and the [UML drawing guide](UML_Class_Diagram_Guide.md). The `smart-charging/` and `what-if/` directories contain the reviewed class diagrams and inventories for those modules. A valid full-capacity Smart Charging request is `Waiting` without an allocation, so its association allows `0..1` allocation per request. All six review images use pale green class-name headers; attributes and operations retain a neutral background.

Keep each feature in its own subfolder. For example, Hub & Identity is in [`hub-identity/`](hub-identity/), with editable PlantUML and a rendered PNG. Use the same feature-folder pattern for the remaining modules as their diagrams are finalized. Use the class ownership in [task_assignment.md](../task_assignment.md). Show essential attributes and state, operation signatures, associations, and multiplicities. Refer to another module's class by name with `<<external>>` and its owner; do not redefine its operations.

Every operation shown must have a matching entry in the module's method catalogue. Keep this design aligned with the use-case scenarios and lifecycle diagrams from Submissions 1–2.
