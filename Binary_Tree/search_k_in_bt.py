def search_k(root, k):
    if not root:
        return False
    if root.val == k:
        return True
    return search_k(root.left, k) or search_k(root.right, k)
