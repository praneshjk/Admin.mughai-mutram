/* =========================================================
   ONLINE DATABASE SETTINGS (Supabase)

   This is what links the admin site and the visitor website.
   Follow SETUP-GUIDE.md (Steps 1 to 4), then replace the line
   below with your Supabase settings.
   Paste the SAME settings in website/supabase-config.js.
========================================================= */

window.MM_SUPABASE = {
    url: "https://exsfqrmegwzfmoiinmwm.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4c2Zxcm1lZ3d6Zm1vaWlubXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDU0ODUsImV4cCI6MjEwNTkyMTQ4NX0.wX_szu-MjiLCxXB28Zk6adTcNlLWBGgd8mYun2y-y3E"
};

/* Example of what it looks like after setup:

window.MM_SUPABASE = {
    url: "https://abcdefghijklmnop.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
};

*/


/* Address of your public website (used by the "View Visitor Website" button).
   Change it to your real address after you put the sites online,
   for example: "https://www.yourschool.in" */
window.MM_WEBSITE_URL = "../website/index.html";
