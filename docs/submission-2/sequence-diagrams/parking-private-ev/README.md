# Sequence Diagrams - Parking & Private EVs

| Use Case | Name | SVG | PNG | Source |
| --- | --- | --- | --- | --- |
| UC-P01 | Reserve a Parking Space | [SVG](SD_ReserveParkingSpace.svg) | [PNG](SD_ReserveParkingSpace.png) | [PlantUML](SD_ReserveParkingSpace.puml) |
| UC-P02 | Submit a Private-EV Charging Request | [SVG](SD_SubmitPrivateEVChargingRequest.svg) | [PNG](SD_SubmitPrivateEVChargingRequest.png) | [PlantUML](SD_SubmitPrivateEVChargingRequest.puml) |
| UC-P03 | View My Parking and Charging Bookings | [SVG](SD_ViewParkingAndChargingBookings.svg) | [PNG](SD_ViewParkingAndChargingBookings.png) | [PlantUML](SD_ViewParkingAndChargingBookings.puml) |
| UC-P04 | Cancel a Parking Reservation | [SVG](SD_CancelParkingReservation.svg) | [PNG](SD_CancelParkingReservation.png) | [PlantUML](SD_CancelParkingReservation.puml) |
| UC-P05 | Cancel a Charging Request | [SVG](SD_CancelChargingRequest.svg) | [PNG](SD_CancelChargingRequest.png) | [PlantUML](SD_CancelChargingRequest.puml) |
| UC-P06 | Check In a Private EV | [SVG](SD_CheckInPrivateEV.svg) | [PNG](SD_CheckInPrivateEV.png) | [PlantUML](SD_CheckInPrivateEV.puml) |
| UC-P07 | Check Out a Private EV | [SVG](SD_CheckOutPrivateEV.svg) | [PNG](SD_CheckOutPrivateEV.png) | [PlantUML](SD_CheckOutPrivateEV.puml) |

## Regenerate Images

Install Java and download PlantUML. Run these commands from this folder, replacing `/path/to/plantuml.jar` with your JAR location:

```sh
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tsvg *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tpng *.puml
```
