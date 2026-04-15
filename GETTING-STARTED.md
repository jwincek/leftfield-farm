# Getting Started with Leftfield Farm Plugin

Welcome! This guide walks you through setting up your website's farm tools — the stand status, availability board, events, and more. You don't need to know how to code. Everything here happens through the WordPress admin.

---

## First Things First

After the plugin is activated, you'll see a **🥕 Leftfield** menu in your WordPress sidebar. Click it to see the dashboard — it shows which modules are active, how much content you have, and your stand's current status.

---

## Step 1: Set Up Your Stand Location

Your roadside stand needs to exist as a Location in WordPress before the stand status tools will work.

1. Go to **Locations → Add New** in the sidebar.
2. **Title**: `Farm Stand` (or whatever you call it).
3. In the post editor sidebar, fill in these fields:
   - **Address**: `1820 E Myrtle Ave, Johnson City, TN 37601`
   - **Location Type**: `stand`
   - **Venmo Handle**: Your Venmo username (without the @)
   - **Hours**: `Saturdays 1:00 – 4:00 PM, May – December`
   - **Season Start**: `2026-05-04`
   - **Season End**: `2026-12-01`
4. If you want the stand to automatically open/close on schedule:
   - **Schedule**: `[{"day": 6, "open": "13:00", "close": "16:00"}]`
     (This means Saturday, 1 PM to 4 PM. Day 6 = Saturday.)
   - **Auto Toggle**: Check this on.
5. **Publish** the location.

You should now see a green or red dot in the admin bar at the top of every page — that's your stand toggle. Click it to open or close the stand from anywhere.

---

## Step 2: Add Your Products

Products are everything you sell — produce, bread, baked goods, seedlings, pantry items.

1. Go to **Products → Add New**.
2. **Title**: The product name (e.g., `Arugula`, `Country Sourdough`).
3. Add a **Featured Image** — this shows up on the availability board.
4. In the sidebar, fill in:
   - **Price**: Whatever you want to display (e.g., `$4/bunch`, `$12/loaf`, `Donation`)
   - **Unit**: The unit of sale (e.g., `bunch`, `loaf`, `pint`)
   - **Growing Notes**: A short note shown to visitors (e.g., `No-till, heirloom variety`)
5. Assign a **Product Type** (Produce, Bread, Baked Good, Pantry Good, Seedling).
6. Assign **Seasons** (Spring, Summer, Fall, Winter) for when this product is typically available.
7. **Publish**.

Repeat for each product. Don't worry about getting them all in at once — you can add more throughout the season.

---

## Step 3: Update Weekly Availability

This is the task you'll do most often — probably every Saturday morning.

1. Go to **🥕 Leftfield → Availability** in the sidebar.
2. You'll see all your products in a table. For each one:
   - Pick a **Status**: Abundant, Available, Limited, Sold Out, or leave it blank (not listed).
   - Add a **Quantity Note** if helpful (e.g., `~3 bunches left`, `Last 2 loaves`).
3. Set the **Effective Date** (defaults to today).
4. Click **Save All Changes**.

That's it — the availability board on your website updates immediately.

---

## Step 4: Place Blocks on Your Pages

Now put the tools on your actual website pages. Go to any page in the editor (or create a new one) and add blocks:

### Homepage (recommended blocks)

- **Stand Status Banner**: Shows open/closed with address, hours, and Venmo link.
  - Add the block, select your stand location in the sidebar.
  - Pick a layout: Banner (full-width), Compact (strip), or Card (centered).
  - Turn on "Auto-refresh" if you want it to update without page reload.

- **Availability Board**: Shows what's available this week.
  - Add the block, choose Grid or List layout.
  - The filters let visitors narrow by status or product type.

### Events Page

- **Event List**: Shows upcoming events with RSVP forms.
  - Add the block, toggle whether to show past events too.
  - RSVP forms appear automatically for events that have RSVPs enabled.

### Anywhere

- **Event Card**: Feature a single event (like the next pizza night) on any page.
- **Product Card**: Highlight a specific product.
- **Location Info**: Show stand details in a sidebar or footer.

---

## Step 5: Create Your First Event

1. Go to **Events → Add New**.
2. **Title**: e.g., `Pizza Night — June 6`
3. Write a description in the editor.
4. In the sidebar, fill in:
   - **Start Date/Time**: `2026-06-06T18:00:00` (June 6 at 6 PM)
   - **End Date/Time**: `2026-06-06T21:00:00` (9 PM)
   - **Location**: Select your Farm Stand location.
   - **Donation Link**: Your Venmo link for the event.
   - **Cost Note**: e.g., `Donation-based — suggested $10/person`
   - **What to Bring**: e.g., `A side dish or dessert to share`
5. To enable RSVPs:
   - **RSVP Enabled**: Check this on.
   - **RSVP Cap**: Set a number (e.g., `30`) or leave at 0 for unlimited.
   - **RSVP Label**: Custom button text (e.g., `Count me in!`)
6. Assign an **Event Type** (Pizza Night, Potluck, Farm Dinner, etc.).
7. **Publish**.

The event will now appear in the Event List block and can be featured with an Event Card block.

---

## Daily Workflow Cheat Sheet

| Task | Where | How Often |
|------|-------|-----------|
| Open/close the stand | Admin bar dot (any page) | Every stand day |
| Set a status message | Admin bar → "Set Status Message…" | As needed |
| Update availability | 🥕 Leftfield → Availability | Weekly (Saturday morning) |
| Add a new product | Products → Add New | As new crops/items come in |
| Create an event | Events → Add New | When planning events |
| Check RSVPs | Events → Edit → view RSVP count | Before each event |

---

## Loading Sample Data (for Testing)

If you want to see how everything looks with example products, events, and availability before entering your real data:

1. Go to **🥕 Leftfield** dashboard.
2. Click **Load Sample Data**.
3. Explore the blocks on your pages to see how they look.
4. When you're ready, click **Remove Sample Data** to clear it all out.

Sample data is clearly labeled so you won't confuse it with real content.

---

## Tips

- **Featured images matter.** Products with photos look much better on the availability board. Even a quick phone photo of the arugula bed or a fresh loaf is great.
- **Keep excerpts short.** The excerpt field on products and events shows up in cards and lists. One sentence is perfect.
- **The admin bar toggle works on your phone.** Open the WordPress app, visit any page on your site, and tap the stand status dot to open or close from the field.
- **Availability expires automatically.** If you set an expiration date on an availability entry, it drops off the board on its own. Useful for "this week only" items.
- **Events sort by date.** Upcoming events appear in chronological order. Past events move to the "Past" section automatically.

---

## Need Help?

This plugin was custom-built for Leftfield Urban Farm. If something isn't working right or you have ideas for improvements, reach out to Jerome.
