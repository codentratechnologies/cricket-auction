import sys
from PIL import Image

def make_white_transparent(img_path, out_path, tolerance=220):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Check if pixel is white or near-white
        if item[0] >= tolerance and item[1] >= tolerance and item[2] >= tolerance:
            # Change all white pixels to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, "PNG")
    print("Saved transparent image to", out_path)

make_white_transparent(sys.argv[1], sys.argv[2])
