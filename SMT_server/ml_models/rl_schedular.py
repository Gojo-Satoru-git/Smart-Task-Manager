import tensorflow as tf
import os
import numpy as np

# All the imports we need
from tf_agents.agents.dqn import dqn_agent
from tf_agents.networks import q_network
from tf_agents.environments import tf_py_environment, py_environment, utils
from tf_agents.specs import array_spec
from tf_agents.utils import common
from tf_agents.trajectories import time_step as ts




class CalendarEnv(py_environment.PyEnvironment):

    def __init__(self):
        # State: 168 hours in a week (7*24)
        # 0 = empty, 1 = full
        self._observation_spec = array_spec.BoundedArraySpec(
            shape=(168,), dtype=np.int32, minimum=0, maximum=1, name='calendar'
        )
        # Action: Pick an hour slot (0-167)
        self._action_spec = array_spec.BoundedArraySpec(
            shape=(), dtype=np.int32, minimum=0, maximum=167, name='choose_slot'
        )
        self._state = np.zeros(168, dtype=np.int32)
        self._episode_ended = False

    def action_spec(self):
        return self._action_spec

    def observation_spec(self):
        return self._observation_spec

    def _reset(self):
        self._state = np.zeros(168, dtype=np.int32)
        self._episode_ended = False
        return ts.restart(self._state)

    def _step(self, action):
        if self._episode_ended:
            return self.reset()
        
        chosen_slot = action
        
        # Simplified logic for testing
        if self._state[chosen_slot] == 1:
            reward = -100
        else:
            reward = 10
        
        self._state[chosen_slot] = 1
        self._episode_ended = True
        return ts.termination(self._state, reward=reward)

# --- 2. Build the Agent (No Saving) ---
def create_agent():
    print("Setting up RL environment...")
    train_py_env = CalendarEnv()
    train_env = tf_py_environment.TFPyEnvironment(train_py_env)

    # Define the Neural Network
    q_net = q_network.QNetwork(
        train_env.observation_spec(),
        train_env.action_spec(),
        fc_layer_params=(128, 64) 
    )
    optimizer = tf.compat.v1.train.AdamOptimizer(learning_rate=1e-3)
    
    agent = dqn_agent.DqnAgent(
        train_env.time_step_spec(),
        train_env.action_spec(),
        q_network=q_net,
        optimizer=optimizer,
        td_errors_loss_fn=common.element_wise_huber_loss,
        train_step_counter=tf.Variable(0)
    )
    agent.initialize()
    print("Agent initialized successfully in memory.")
    return agent


if __name__ == '__main__':
    print("--- Testing Agent Creation ---")
    agent = create_agent()
    print("--- Test Complete. Agent is buildable. ---")