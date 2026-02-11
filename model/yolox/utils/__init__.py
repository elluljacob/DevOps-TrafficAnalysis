#!/usr/bin/env python3
# Copyright (c) Megvii Inc. All rights reserved.

# Trimmed for inference-only usage
from .boxes import *
from .model_utils import *
from .visualize import *


import torch

_TORCH_VER = [int(x) for x in torch.__version__.split(".")[:2]]


def meshgrid(*tensors):
    """Inlined from compat.py — torch.meshgrid compatibility wrapper."""
    if _TORCH_VER >= [1, 10]:
        return torch.meshgrid(*tensors, indexing="ij")
    else:
        return torch.meshgrid(*tensors)
