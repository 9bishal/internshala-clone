def top_view(root):
    from collections import defaultdict
    
    if not root:
        return []
    
    q = deque([(root,0)])
    hd_map = {}
    
    while q:
        node, hd = q.popleft()
        
        if hd not in hd_map:
            hd_map[hd] = node.val
        
        if node.left:
            q.append((node.left, hd-1))
        if node.right:
            q.append((node.right, hd+1))
    
    return [hd_map[x] for x in sorted(hd_map)]