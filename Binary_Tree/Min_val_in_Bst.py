def find_min(root):
    while root.left:
        root = root.left
    return root.val