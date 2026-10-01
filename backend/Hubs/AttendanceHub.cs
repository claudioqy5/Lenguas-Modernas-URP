using Microsoft.AspNetCore.SignalR;

namespace AsistenciaLenguas.Api.Hubs
{
    /// <summary>
    /// SignalR Hub for real-time attendance notifications.
    /// Connected admin dashboards listen to this hub and receive
    /// instant updates when a student checks in.
    /// </summary>
    public class AttendanceHub : Hub
    {
        // Clients call this to join the admin group (optional, for future use)
        public async Task JoinAdminGroup()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }
    }
}
