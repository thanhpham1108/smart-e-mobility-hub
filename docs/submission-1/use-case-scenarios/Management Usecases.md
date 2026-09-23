| Use case's ID | UC-HI-01                                       |
| ------------- | ---------------------------------------------- |
| Use case name | Manage Personal Profile                        |
| Actor         | User                                           |
| Pre condition | User is logged in and has an existing profile. |
| Trigger       | User selects Profile.                          |
| Priority      | High                                           |
| Assumption    | Good internet connection                       |

Main Flow:

1. Users/drivers choose profile.
2. Select edit profile
3. System displays the user's profile and identifies editable fields.
4. User updates permitted profile information, such as contact details.
5. User selects Finish Editing.
6. System validates and updates the profile.
7. System displays "Profile updated successfully."

Alternative flow:

A1. View only:

2a. User chooses not to edit and only views the profile, then exits.

A2. Cancel editing:

4b. User choose exit without saving, the system keeps the old information:

Exception flow:

E1. Invalid information (E.g. letters in telephone field): System identifies the invalid field and displays the required format (E.g. Enter numbers only)

| Use case's ID | UC-HI-02                 |
| ------------- | ------------------------ |
| Use case name | Find a Mobility Hub      |
| Actor         | User                     |
| Preq          | Need wifi/mobile data    |
| Trigger       | User open the app        |
| Priority      | Medium                   |
| Assumption    | Good internet connection |

Main Flow:

1. User selects Find a Mobility Hub.
2. System displays Hub search/filter options.
3. User specifies criteria such as location and required services.
4. System searches for Mobility Hubs matching the criteria.
5. System displays matching Hubs.
6. User selects a Hub for further inspection..

Alternative flow:

A1. Change search location

3a. User chooses to search using another location instead of the current GPS location.

3b. System searches for Mobility Hubs near the specified location.

3c. Resume at step 5.

Exception flow:

E1. Current location unavailable:

3a. System cannot obtain the user's current location.

3b. System informs the user and allows manual location entry.

E2. No Mobility Hub found:

4a. If no Mobility Hub is found near the selected location, the system informs the user.

4b. User may change the search location or search range.

| Use case's ID | UC-HI-03                 |
| ------------- | ------------------------ |
| Use case name | View Hub Status          |
| Actor         | User, Rider              |
| Preq          | Need wifi/mobile data    |
| Trigger       | User open the app        |
| Priority      | Medium                   |
| Assumption    | Good internet connection |

Main Flow:

1. User selects a Mobility Hub from the search results.
2. System retrieves the selected Hub's latest status.
3. System retrieves shared-vehicle availability.
4. System retrieves parking occupancy/capacity.
5. System retrieves charging-point availability.
6. System retrieves vehicle battery information and operational status where applicable.
7. System displays the Hub status together with a data timestamp/freshness indicator.

Alternative flow:

A1. Hub at full capacity:

4a. System indicates that the selected Hub has no available parking capacity.

4b. User may select another Mobility Hub.

A2. No available vehicles:

3a. System indicates that no vehicles are currently available at the selected Hub.

3b. User may select another Mobility Hub.

A3. Low battery availability:

6a. System indicates that the available vehicles have low battery levels.

6b. User may choose another vehicle or another Mobility Hub.Exception flow:

Exception flow:

E1 Battery/capacity unavailable:

System throws an error for user know and change choice

E2 Unexpected data change:

System refresh availability and informs user.

E3. Vehicle/battery status unavailable:

6a. System cannot retrieve the current status of one or more vehicles.

6b. System marks the affected vehicle information as unavailable and informs the user.