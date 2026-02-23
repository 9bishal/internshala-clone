def right_view(root):
    if not root:
        return []
    
    q = deque([root])
    result = []
    
    while q:
        for i in range(len(q)):
            node = q.popleft()
            
            if i == 0:
                rightmost = node
            
            if node.right:
                q.append(node.right)
            if node.left:
                q.append(node.left)
        
        result.append(rightmost.val)
    
    return result