class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
root = Node(10)
root.left = Node(5)
root.right = Node(15)
root.left.left = Node(2)
root.left.right = Node(7) 