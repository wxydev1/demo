#include <iostream>
#include "vec3.h"
#include "color.h"
#include "ray.h"
bool hit_sphere(const point3 &center, double radius, const ray &r)
{
    vec3 oc = r.origin() - center;
    auto op_square = dot(r.direction(), r.direction());
    auto oc_square = dot(oc, oc);
    auto two_op_oc = dot(r.direction(), oc) * 2.0;
    auto discriminant = op_square + oc_square + two_op_oc - radius * radius;
    auto a = dot(r.direction() - oc, r.direction() - oc);
    // std::cerr << (r.direction() ) << std::endl;
    if (a < 4 * radius * radius)
    {
        // std::cerr << a << std::endl;
    }

    return (discriminant < 0);

    // auto a = dot(r.direction(), r.direction());
    // auto b = 2.0 * dot(oc, r.direction());
    // auto c = dot(oc, oc) - radius*radius;
    // auto discriminant = b*b - 4*a*c;
    // return (discriminant > 0);
}
color ray_color(const ray &r)
{
    if (hit_sphere(point3(0, 0, -1), 0.5, r))
        return color(1, 0, 0);
    // std::cerr << r.dir << std::endl;
    vec3 unit_direction = unit_vector(r.direction());
    auto t = 0.5 * (unit_direction.y() + 1.0); // 0 ~ 1

    return (1.0 - t) * color(1.0, 1.0, 1.0) + t * color(0.5, 0.7, 1.0);
}
int main()
{

    // Image
    const auto aspect_ratio = 16.0 / 9.0;

    const int image_width = 400;
    const int image_height = static_cast<int>(image_width / aspect_ratio);

    // Camera
    auto viewport_height = 2.0;
    auto viewport_width = aspect_ratio * viewport_height;
    auto focal_length = 1.0;

    auto origin = point3(0, 0, 0);
    // 往 x 轴方向的向量
    auto horizontal = vec3(viewport_width, 0, 0);
    // 往 y 轴方向的向量
    auto vertical = vec3(0, viewport_height, 0);
    // auto lower_left_corner = origin - horizontal / 2 - vertical / 2 - vec3(0, 0, focal_length);
    auto lower_left_corner = origin - horizontal / 2 - vertical / 2 - vec3(0, 0, focal_length);

    // Render

    std::cout << "P3\n"
              << image_width << ' ' << image_height << "\n255\n";

    for (int j = 0; j < image_height; j++)
    {
        std::cerr << "\rScanlines remaining: " << j << " " << std::flush;
        for (int i = 0; i < image_width; ++i)
        {
            auto u = double(i) / (image_width - 1);
            auto v = double(j) / (image_height - 1);
            ray r(origin, lower_left_corner + u * horizontal + v * vertical - origin);
            // ray r(origin, (u-0.5) * horizontal + (v - 0.5) * vertical - origin);

            color pixel_color = ray_color(r);
            write_color(std::cout, pixel_color);
        }
    }
    std::cerr << "\nDone.\n";
    // std::cerr << hit_sphere(point3(1, 1, 1), 0.5, ray(point3(0, 0, 0), vec3(0.1, 0.5, 0.5)));

    // vec3 vec(1.0, 3.0, 1.0);
    // double one = vec[0];
    // double two = vec[1];
    // double three = vec[2];
    // std::cout << std::endl;
    // std::cout << one << " " << two << " " << three << std::endl;
    // std::cout << vec.length() << std::endl;
}