from PIL import Image

def remove_checkerboard(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # Check if the pixel is greyscale and light (checkerboard)
        # The blue shades will have B significantly higher than R and G.
        
        # If it's very close to greyscale and light
        if r > 220 and g > 220 and b > 220 and abs(r-g) < 15 and abs(g-b) < 15:
            # It's part of the checkerboard (white or light grey)
            new_data.append((255, 255, 255, 0)) # Make it transparent
        else:
            # Keep the pixel, but if it has a white/grey background blended into it,
            # we can't easily un-blend, but we keep it.
            # To avoid a hard edge, we can add some partial transparency if it's close to grey.
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

remove_checkerboard(r'd:\Python\cricket software\frontend\assets\images\static ball.png', r'd:\Python\cricket software\frontend\assets\images\static ball fixed.png')
