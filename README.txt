OFFICE BOOKING - NOTIFICATION SYSTEM
====================================

Copy the included folders into the root of your project and allow Windows to replace matching files.

FEATURES
--------
1. Bell icon in the navbar with unread-count badge.
2. Instagram-style notification preview dropdown.
3. Full /notifications page.
4. All / Unread / Bookings / Rooms filters.
5. Mark one notification as read.
6. Mark all notifications as read.
7. Delete notifications.
8. Notifications are created automatically for:
   - Booking submitted
   - New booking request for Manager, HR or Super Admin
   - Booking approved
   - Booking rejected
   - Booking cancellation
   - Room creation and updates
   - Room image updates
   - Room-area layout updates
9. Employees, HR, Managers and Super Admins can access notifications.

DATABASE SETUP - REQUIRED
-------------------------
After copying the files, apply the included Prisma migration to the database configured by DATABASE_URL:

npx prisma migrate deploy
npx prisma generate

Then clear the Next.js cache and build:

Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev

IMPORTANT
---------
- Back up prisma/schema.prisma and the project before replacing files.
- The migration creates the Notification table and NotificationType enum.
- Do not run the migration more than once manually in SQL. Prisma records applied migrations.
- Vercel's build normally generates Prisma Client but does not automatically apply database migrations. Run `npx prisma migrate deploy` locally against the Supabase production DATABASE_URL before deploying, or add an approved migration step to your deployment workflow.

TESTING
-------
Employee:
- Create a booking.
- Confirm a "Booking submitted" notification appears.
- After approval or rejection, confirm the result appears.

Manager / HR / Super Admin:
- Confirm new pending bookings produce a notification.
- Approve or reject a booking.
- Create or edit a room, upload a room image, or change an area position.
- Confirm room-update notifications appear.

Open:
http://localhost:3000/notifications
