#include "aabb.h"

aabb aabb_create(u16 x, u16 y, u16 w, u16 h)
{
	return ((aabb){x, y, w, h});
}

void aabb_top(aabb box, float *x, float *y)
{
	*x = box.x + box.w / 2.0;
	*y = box.y;
}

void aabb_bottom(aabb box, float *x, float *y)
{
	*x = box.x + box.w / 2.0;
	*y = box.y + box.h;
}

void aabb_left(aabb box, float *x, float *y)
{
	*x = box.x;
	*y = box.y + box.h / 2.0;
}

void aabb_right(aabb box, float *x, float *y)
{
	*x = box.x + box.w;
	*y = box.y + box.h / 2.0;
}

void aabb_center(aabb box, float *x, float *y)
{
	*x = box.x + box.w / 2.0;
	*y = box.y + box.h / 2.0;
}
