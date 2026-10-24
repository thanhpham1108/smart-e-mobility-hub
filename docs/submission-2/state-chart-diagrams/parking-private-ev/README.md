# State-Chart Diagrams - Parking & Private EVs

| Use Case | Name | SVG | PNG | Source |
| --- | --- | --- | --- | --- |
| UC-P01, UC-P04, UC-P06, UC-P07 | Parking Reservation Lifecycle | [SVG](SC_ParkingReservation.svg) | [PNG](SC_ParkingReservation.png) | [PlantUML](SC_ParkingReservation.puml) |

## Regenerate Images

Install Java and download PlantUML. Run these commands from this folder, replacing `/path/to/plantuml.jar` with your JAR location:

```sh
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tsvg *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tpng *.puml
```
