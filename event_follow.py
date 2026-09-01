import json

with open("data/raw/events/3857276.json", "r", encoding="utf-8") as f:
    events = json.load(f)

events_by_id = {event["id"]: event for event in events}

events.sort(key=lambda x: (x["period"], x["timestamp"]))

count = 0
poss = 0
events_done = []

with open("data/event_follow/match=3857276.txt","w",encoding="utf-8") as f2:

    for i in events:

        count += 1

        id = i.get("id")
        time_stamp = i.get("timestamp")
        type_eve = i.get("type", {}).get("name")

        possession = i.get("possession")
        possession_team = i.get("possession_team", {}).get("name")

        play_pattern = i.get("play_pattern", {}).get("name")
        p_team = i.get("team", {}).get("name")
        p_name = i.get("player", {}).get("name")
        p_pos = i.get("position", {}).get("name")

        location = i.get("location", [None, None])
        p_loc_x = location[0]
        p_loc_y = location[1]

        under_press = i.get("under_pressure")
        rel_events = i.get("related_events", [])

        f2.write(f"Event : {count}\n")

        if possession != poss:
            f2.write(
                f"POSSESSION {possession} - {possession_team}\n\n"
            )
            poss = possession

        f2.write(
            f"{id}\n"
            f"Time : {time_stamp}\n"
            f"Action : {type_eve}\n"
            f"Play pattern : {play_pattern}\n"
            f"Team : {p_team}\n"
            f"Player : {p_name}\n"
            f"Position : {p_pos}\n"
            f"Location : ({p_loc_x}, {p_loc_y})\n"
            f"Under pressure : {under_press}\n"
        )

        events_done.append(id)

        if rel_events:

            f2.write("    RELATED EVENTS\n")

            for j in rel_events:

                if j in events_done:
                    continue

                related_event = events_by_id.get(j)

                if not related_event:
                    continue

                related_id = related_event.get("id")
                related_time = related_event.get("timestamp")
                related_type = related_event.get(
                    "type", {}
                ).get("name")

                related_possession = related_event.get(
                    "possession"
                )

                related_possession_team = related_event.get(
                    "possession_team", {}
                ).get("name")

                related_pattern = related_event.get(
                    "play_pattern", {}
                ).get("name")

                related_team = related_event.get(
                    "team", {}
                ).get("name")

                related_player = related_event.get(
                    "player", {}
                ).get("name")

                related_position = related_event.get(
                    "position", {}
                ).get("name")

                related_location = related_event.get(
                    "location", [None, None]
                )

                related_x = related_location[0]
                related_y = related_location[1]

                related_pressure = related_event.get(
                    "under_pressure"
                )

                f2.write(
                    f"        ↓\n"
                    f"        {related_id}\n"
                    f"        Time : {related_time}\n"
                    f"        Action : {related_type}\n"
                    f"        Play pattern : {related_pattern}\n"
                    f"        Team : {related_team}\n"
                    f"        Player : {related_player}\n"
                    f"        Position : {related_position}\n"
                    f"        Location : ({related_x}, {related_y})\n"
                    f"        Under pressure : {related_pressure}\n"
                )

                events_done.append(related_id)

        f2.write("\n" + "-" * 70 + "\n\n")