def left_view(root):
    if not root:
        return []
    
    q = deque([root])
    result = []
    
    while q:
        for i in range(len(q)):
            node = q.popleft()
            
            if i == 0:
                result.append(node.val)
            
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    
    return result