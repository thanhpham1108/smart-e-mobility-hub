# Activity Diagrams - External Telemetry

| Use Case | Name | SVG | PNG | Source |
| --- | --- | --- | --- | --- |
| UC-T01 | Update Vehicle Telemetry | [SVG](AD_UpdateVehicleTelemetry.svg) | [PNG](AD_UpdateVehicleTelemetry.png) | [PlantUML](AD_UpdateVehicleTelemetry.puml) |
| UC-T02 | Update Parking Occupancy | [SVG](AD_UpdateParkingOccupancy.svg) | [PNG](AD_UpdateParkingOccupancy.png) | [PlantUML](AD_UpdateParkingOccupancy.puml) |
| UC-T03 | Update Charging-Point Status | [SVG](AD_UpdateChargingPointStatus.svg) | [PNG](AD_UpdateChargingPointStatus.png) | [PlantUML](AD_UpdateChargingPointStatus.puml) |

## Regenerate Images

Install Java and download PlantUML. Run these commands from this folder, replacing `/path/to/plantuml.jar` with your JAR location:

```sh
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tsvg *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tpng *.puml
```
