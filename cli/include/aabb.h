#ifndef AABB_H
# define AABB_H

#include "types.h"

// aabb: axis-aligned bouding box (basically a non-rotated rectangle)
typedef struct
{
	u16	x;
	u16	y;
	u16	w;
	u16	h;
}	aabb;

aabb aabb_create(u16 x, u16 y, u16 w, u16 h);

void aabb_top(aabb box, float *x, float *y);
void aabb_bottom(aabb box, float *x, float *y);
void aabb_left(aabb box, float *x, float *y);
void aabb_right(aabb box, float *x, float *y);
void aabb_center(aabb box, float *x, float *y);

#endif
