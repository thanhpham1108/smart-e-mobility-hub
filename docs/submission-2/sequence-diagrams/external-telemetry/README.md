# Sequence Diagrams - External Telemetry

| Use Case | Name | SVG | PNG | Source |
| --- | --- | --- | --- | --- |
| UC-T01 | Update Vehicle Telemetry | [SVG](SD_UpdateVehicleTelemetry.svg) | [PNG](SD_UpdateVehicleTelemetry.png) | [PlantUML](SD_UpdateVehicleTelemetry.puml) |
| UC-T02 | Update Parking Occupancy | [SVG](SD_UpdateParkingOccupancy.svg) | [PNG](SD_UpdateParkingOccupancy.png) | [PlantUML](SD_UpdateParkingOccupancy.puml) |
| UC-T03 | Update Charging-Point Status | [SVG](SD_UpdateChargingPointStatus.svg) | [PNG](SD_UpdateChargingPointStatus.png) | [PlantUML](SD_UpdateChargingPointStatus.puml) |

## Regenerate Images

Install Java and download PlantUML. Run these commands from this folder, replacing `/path/to/plantuml.jar` with your JAR location:

```sh
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tsvg *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tpng *.puml
```
