from collections import deque

def bfs(root):
    if not root:
        return
    
    q = deque([root])
    while q:
        node = q.popleft()
        print(node.val, end=" ")
        
        if node.left:
            q.append(node.left)
        if node.right:
            q.append(node.right)