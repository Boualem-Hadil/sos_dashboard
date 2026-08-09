import sys
from PIL import Image

def remove_bg_and_crop(filepath):
    print(f"Processing {filepath}")
    
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()
    bg_color = datas[0]
    tolerance = 15
    
    new_data = []
    for item in datas:
        if (abs(item[0] - bg_color[0]) <= tolerance and
            abs(item[1] - bg_color[1]) <= tolerance and
            abs(item[2] - bg_color[2]) <= tolerance):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Crop to bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(filepath)
    print(f"Saved processed and cropped image to {filepath}")

remove_bg_and_crop("public/logo-light.png")
remove_bg_and_crop("public/logo-dark.png")
