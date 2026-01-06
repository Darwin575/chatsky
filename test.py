# import math
from typing import List
def firstMissingPositive(nums: List[int]) -> int:

    maxi = max(nums)
    for num in range(1, abs(maxi) + 2):
        print(maxi)
        if num not in nums:
            return num
        # if nums[num] > max:
        #     max = nums[num] + 1
            
            
            
print(firstMissingPositive([1,2,0]))