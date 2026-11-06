using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание1
{
    public partial class Form1 : Form
    {
        int a = 0;
        int b = 0;
        int Res = 0;

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            Sum();
        }

        public int operand(TextBox Tb)
        {
            int x;
            bool B = int.TryParse(Tb.Text, out x);
            if (!B)
                x = 0;
            return x;
        }

        private void Sum()
        {
            Res = a + b;
            textBox3.Text = Res.ToString();
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            a = operand(textBox1);
            Sum();
        }

        private void textBox2_TextChanged(object sender, EventArgs e)
        {
            b = operand(textBox2);
            Sum();
        }

        private void textBox1_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                textBox1.Text = a.ToString();
                textBox2.Focus();
                e.SuppressKeyPress = true;
            }
        }

        private void textBox2_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                textBox2.Text = b.ToString();
                button1.Focus();
                e.SuppressKeyPress = true;
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            Sum();
        }
    }
}
