# mc-manager
This is a simple tool to host and control minecraft servers. It uses node.js and powershell to perform its different functions.

## allowRequests
boolean, true/false - this is toggled inside the manager. Defines whether or not others can make requests to start and/or stop the server.

## backup
boolean, true/false - Whether or not the tool should make backups (requires 7z). Toggled in manager.

## discord
string, plain text link to display on web interface

## minecraft_version
string, defines which version to run. Selected in manager.

## player_check_timer
int, defines how often to check for active users.

## reboot
boolean, true/false - Automatically reboots server on shutdown. Toggled in manager.

## server.ram
string, defines how much RAM to allocate to the server. Edited in the manager.

## server_host_address
string, ip/web address to print on web interface.

## server_name
string, name of server

## shutdown
boolean, whether or not to shut down the server

## version
string, web interface info

## web_color
int, color to use in web interface.
