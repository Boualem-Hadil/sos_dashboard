from PIL import Image

def process_image(filepath, tolerance, bg_color=None):
    img = Image.open(filepath).convert("RGBA")
    
    # If bg_color is not provided, sample the top-left corner
    if bg_color is None:
        bg_color = img.getpixel((0,0))
        
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        if (abs(item[0] - bg_color[0]) <= tolerance and
            abs(item[1] - bg_color[1]) <= tolerance and
            abs(item[2] - bg_color[2]) <= tolerance):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    bbox = img.getbbox()
    if bbox:
        print(f"{filepath} bbox: {bbox}")
        img = img.crop(bbox)
    else:
        print(f"{filepath} no bbox found!")
        
    img.save(filepath)
    print(f"Processed {filepath}")

# Dark logo has a dark background around (25, 39, 44), we use tolerance 40
process_image('public/logo-dark.png', tolerance=40)

# Light logo has a white background (255, 255, 255), we use tolerance 15
process_image('public/logo-light.png', tolerance=15, bg_color=(255,255,255,255))
