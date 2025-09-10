#include "term.h"
#include <math.h>

static float calc_distance(float x1, float y1, float x2, float y2)
{
	return ((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

static float calculate_weight(direction dir, float x1, float y1, float x2, float y2, float max_dist_squared)
{
	if ((dir == LEFT && x1 < x2) ||
		(dir == RIGHT && x1 > x2) ||
		(dir == UP && y1 < y2) || 
		(dir == DOWN && y1 > y2))
		return (NAN);
	
	float dist_squared = calc_distance(x1, y1, x2, y2);
	float angle = fabs(atan2(x1 - x2, y1 - y2));
    if (dir == UP || dir == DOWN)
		angle = fabs(M_PI / 2 - angle);
	angle = fabs(angle - M_PI / 2);

	// `angle` ends up being the angle between the normal of the box's edge and the other box's opposite edge.
	// for example if the boxes are in front of each other angle is 0
	// angle is between 0 and pi / 2 (aka 180 degrees)

	if (angle > 110 * M_PI / 360)
		return (NAN);

	float x = 0.5 + angle / M_PI;
	(void)max_dist_squared;
	return (pow(dist_squared / max_dist_squared, 1.5f) * x);
}

static direction opposite_dir_map[] = {
	[LEFT] = RIGHT,
	[RIGHT] = LEFT,
	[UP] = DOWN,
	[DOWN] = UP
};

static void get_box_edge(direction dir, aabb box, float *x, float *y)
{
	switch (dir)
	{
		case LEFT:
			aabb_left(box, x, y);
			break;
		case RIGHT:
			aabb_right(box, x, y);
			break;
		case UP:
			aabb_top(box, x, y);
			break;
		case DOWN:
			aabb_bottom(box, x, y);
			break;
	}
	*x *= c_pixel_ratio;
}

// gets the max distance (squared) between two boxes among the entire set of boxes,
// taking into account the box's normal according to the direction
static float max_distance_squared(direction dir)
{
	direction opposite_dir = opposite_dir_map[dir];

	float max_dist = 0;
	console_component *cur1, *cur2;
	float cur1_x, cur1_y, cur2_x, cur2_y;
	for (size_t i = 0; i < cur_term_window->components_count; i++)
	{
		cur1 = &cur_term_window->components[i];
		if (!is_selectable(cur1))
			continue;
		get_box_edge(dir, component_bouding_box(cur1), &cur1_x, &cur1_y);
		for (size_t j = 0; j < cur_term_window->components_count; j++)
		{
			cur2 = &cur_term_window->components[j];
			if (j != i && is_selectable(cur2))
			{
				get_box_edge(opposite_dir, component_bouding_box(cur2), &cur2_x, &cur2_y);
				float cur_dist = calc_distance(cur1_x, cur1_y, cur2_x, cur2_y);
				if (cur_dist > max_dist)
					max_dist = cur_dist;
			}
		}
	}
	return (max_dist);
}

size_t find_best_component(direction dir)
{
	console_component *cur = ccurrent_component();
	if (!cur)
		return (-1u);
	float cur_edge_x, cur_edge_y, target_edge_x, target_edge_y;
	float max_dist_squared = max_distance_squared(dir);
	direction opp_dir = opposite_dir_map[dir];

	get_box_edge(dir, component_bouding_box(cur), &cur_edge_x, &cur_edge_y);

	size_t closest_component_idx = -1u;
	float closest_component_weight = FLT_MAX;
	for (size_t i = 0; i < cur_term_window->components_count; i++)
	{
		console_component *target = &cur_term_window->components[i];
		if (i == cur_term_window->selected_component || !is_selectable(target))
			continue;
		get_box_edge(opp_dir, component_bouding_box(target), &target_edge_x, &target_edge_y);
		float weight = calculate_weight(
			dir,
			cur_edge_x, cur_edge_y,
			target_edge_x, target_edge_y,
			max_dist_squared);
		if (!isnan(weight) && weight < closest_component_weight)
		{
			closest_component_idx = i;
			closest_component_weight = weight;
		}
	}
	return (closest_component_idx);
}
